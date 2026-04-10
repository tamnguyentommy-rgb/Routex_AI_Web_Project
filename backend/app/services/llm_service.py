import os
import json
import asyncio
from dotenv import load_dotenv

load_dotenv(override=False)

def _load_keys(primary_env: str, *extra_envs: str, count: int = 0) -> list:
    keys = []
    primary = os.getenv(primary_env)
    if primary:
        keys.append(primary)
    for env in extra_envs:
        k = os.getenv(env)
        if k:
            keys.append(k)
    for i in range(2, count + 1):
        k = os.getenv(f"{primary_env}_{i}")
        if k:
            keys.append(k)
    seen = []
    for k in keys:
        if k not in seen:
            seen.append(k)
    return seen

_GEMINI_KEYS = _load_keys("GEMINI_API_KEY", "GOOGLE_API_KEY", count=10)
_GROQ_KEYS   = _load_keys("GROQ_API_KEY", count=2)
_OPENAI_KEYS = _load_keys("OPENAI_API_KEY", count=2)

_GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash-preview-04-17',
]
_GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
]
_OPENAI_MODELS = [
    'gpt-4o-mini',
    'gpt-3.5-turbo',
]

for _var in ("GOOGLE_API_KEY", "GEMINI_API_KEY"):
    if _var in os.environ:
        del os.environ[_var]

def _log_status():
    parts = []
    if _GEMINI_KEYS:
        parts.append(f"Gemini: {len(_GEMINI_KEYS)} key(s)")
    if _GROQ_KEYS:
        parts.append(f"Groq: {len(_GROQ_KEYS)} key(s)")
    if _OPENAI_KEYS:
        parts.append(f"OpenAI: {len(_OPENAI_KEYS)} key(s)")
    if parts:
        print(f"🔑 LLM providers loaded — {' · '.join(parts)}")
    else:
        print("⚠️  No LLM API keys found! Set GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY.")

_log_status()

from google import genai as _genai

class LLMService:
    def __init__(self):
        self._gemini_clients: dict[str, _genai.Client] = {}
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.prompt_path = os.path.join(base_dir, 'prompts', 'advisor.txt')

    def _get_gemini_client(self, api_key: str) -> _genai.Client:
        if api_key not in self._gemini_clients:
            self._gemini_clients[api_key] = _genai.Client(api_key=api_key)
        return self._gemini_clients[api_key]

    async def _try_gemini(self, prompt: str) -> str | None:
        if not _GEMINI_KEYS:
            return None
        for model in _GEMINI_MODELS:
            for key in _GEMINI_KEYS:
                client = self._get_gemini_client(key)
                try:
                    response = await client.aio.models.generate_content(
                        model=model, contents=prompt
                    )
                    return response.text
                except Exception as e:
                    err = str(e)
                    if "404" in err or "NOT_FOUND" in err:
                        continue
                    await asyncio.sleep(0.3)
                    continue
        return None

    async def _try_groq(self, prompt: str) -> str | None:
        if not _GROQ_KEYS:
            return None
        try:
            from groq import AsyncGroq
        except ImportError:
            return None
        for key in _GROQ_KEYS:
            for model in _GROQ_MODELS:
                try:
                    client = AsyncGroq(api_key=key)
                    chat = await client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model=model,
                        max_tokens=2048,
                    )
                    return chat.choices[0].message.content
                except Exception as e:
                    err = str(e)
                    if "404" in err or "model_not_found" in err.lower():
                        continue
                    await asyncio.sleep(0.3)
                    continue
        return None

    async def _try_openai(self, prompt: str) -> str | None:
        if not _OPENAI_KEYS:
            return None
        try:
            from openai import AsyncOpenAI
        except ImportError:
            return None
        for key in _OPENAI_KEYS:
            for model in _OPENAI_MODELS:
                try:
                    client = AsyncOpenAI(api_key=key)
                    chat = await client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model=model,
                        max_tokens=2048,
                    )
                    return chat.choices[0].message.content
                except Exception as e:
                    err = str(e)
                    if "404" in err or "model_not_found" in err.lower():
                        continue
                    await asyncio.sleep(0.3)
                    continue
        return None

    async def _call(self, prompt: str) -> str | None:
        """Try Gemini → Groq → OpenAI until one succeeds."""
        result = await self._try_gemini(prompt)
        if result:
            return result

        print("[LLM] Gemini exhausted, trying Groq...")
        result = await self._try_groq(prompt)
        if result:
            return result

        print("[LLM] Groq exhausted, trying OpenAI...")
        result = await self._try_openai(prompt)
        return result

    async def _call_json(self, prompt: str) -> str | None:
        raw = await self._call(prompt)
        if not raw:
            return None
        text = raw.strip()
        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else text
            if text.startswith("json"):
                text = text[4:]
        return text.strip()

    async def generate_advice(self, current_state: dict, ml_scenarios: list) -> str:
        scenarios_text = ""
        for s in ml_scenarios:
            action = s['action']
            scenarios_text += (
                f"- {s['name']} "
                f"({action['action_planned_time']} phút, "
                f"{action['action_topic_count']} chủ đề, "
                f"độ khó {action['action_avg_difficulty']}, "
                f"tỷ lệ ôn tập {int(action['action_review_ratio']*100)}%): "
                f"AI dự đoán điểm đạt {s['predicted_score']}\n"
            )
        try:
            with open(self.prompt_path, 'r', encoding='utf-8') as f:
                prompt_template = f.read()
        except FileNotFoundError:
            return "❌ Lỗi hệ thống: Không tìm thấy file prompts/advisor.txt"

        final_prompt = prompt_template.format(
            current_score=current_state.get('current_score', 0),
            weak_ratio=int(current_state.get('weak_ratio', 0) * 100),
            prev_week_time=current_state.get('prev_week_time', 0),
            scenarios_text=scenarios_text
        )
        result = await self._call(final_prompt)
        return result if result else "⚠️ Routex AI đang bảo trì, thử lại sau nhé!"

    async def generate_roadmap_plan(self, scenario: dict, user_config: dict) -> dict:
        subject = user_config.get("subject", "Toán")
        grade = user_config.get("grade", 12)
        current_score = user_config.get("current_score", 5.0)
        weak_ratio = int(user_config.get("weak_ratio", 0.3) * 100)
        scenario_name = scenario.get("name", "Lộ trình Cân bằng")
        action = scenario.get("action", {})
        topic_count = action.get("action_topic_count", 4)
        planned_time = action.get("action_planned_time", 300)
        avg_difficulty = action.get("action_avg_difficulty", 0.5)
        total_weeks = user_config.get("duration_weeks", 4)
        display_weeks = min(total_weeks, 12)
        phase_note = f" (giai đoạn 1 trong tổng {total_weeks} tuần)" if total_weeks > display_weeks else ""

        prompt = f"""Bạn là Routex AI, trợ lý học tập thông minh. Học sinh đã chọn "{scenario_name}" với:
- Môn học: {subject} lớp {grade}
- Điểm hiện tại: {current_score}/10
- Tỷ lệ điểm yếu: {weak_ratio}%
- Số chủ đề mỗi tuần: {topic_count}
- Thời gian học: {planned_time} phút/tuần
- Độ khó: {avg_difficulty * 10:.1f}/10
- Tổng thời gian ôn tập: {total_weeks} tuần cho đến kỳ thi

Hãy tạo lộ trình học tập CHI TIẾT cho {display_weeks} tuần{phase_note}. Mỗi tuần phải có chủ đề cụ thể của môn {subject} lớp {grade} thực tế. Phân bổ nội dung phù hợp với {total_weeks} tuần chuẩn bị: tuần đầu xây nền tảng, giữa luyện sâu, cuối ôn tổng hợp.

Trả về JSON theo ĐÚNG định dạng này (không có markdown, không giải thích thêm):
{{
  "scenario_name": "{scenario_name}",
  "subject": "{subject}",
  "grade": {grade},
  "total_weeks": {total_weeks},
  "weeks": [
    {{
      "week": 1,
      "theme": "Tên theme ngắn gọn tuần 1",
      "goal": "Mục tiêu cụ thể tuần 1",
      "topics": [
        {{
          "name": "Tên chủ đề 1",
          "subtopics": ["subtopic 1", "subtopic 2", "subtopic 3"],
          "time_minutes": 90,
          "difficulty": 0.4,
          "key_idea": "Ý tưởng chính cần nhớ"
        }}
      ]
    }},
    ... (tiếp tục đến tuần {display_weeks}, mỗi tuần đầy đủ như tuần 1)
  ]
}}

Chỉ trả về JSON thuần túy. Phải có đủ {display_weeks} tuần trong mảng "weeks"."""

        text = await self._call_json(prompt)
        if not text:
            return {"scenario_name": scenario_name, "subject": subject, "grade": grade, "error": "all_providers_exhausted", "weeks": []}
        try:
            return json.loads(text)
        except Exception as e:
            return {"scenario_name": scenario_name, "subject": subject, "grade": grade, "error": str(e), "weeks": []}

    async def chat(self, message: str, user_context: dict) -> str:
        username = user_context.get("username", "")
        subject = user_context.get("subject", "")
        grade = user_context.get("grade", "")
        mode = user_context.get("mode", "")
        target_score = user_context.get("target_score", 0)
        daily_study_time = user_context.get("daily_study_time", 0)
        current_score = user_context.get("current_score", 0)
        mastery_avg = user_context.get("mastery_avg", 0)
        strong_count = user_context.get("strong_count", 0)
        weak_count = user_context.get("weak_count", 0)
        total_topics = user_context.get("total_topics", 0)
        weak_topics = user_context.get("weak_topics", [])
        scenario_name = user_context.get("scenario_name", "")
        current_week_theme = user_context.get("current_week_theme", "")

        system_ctx = ""
        if subject:
            system_ctx = f"""Thông tin học sinh:
- Tên: {username or 'Học sinh'}
- Môn học: {subject} lớp {grade}
- Điểm hiện tại: {current_score}/10 | Mục tiêu: {target_score}/10
- Độ thành thạo trung bình: {mastery_avg}%
- Chủ đề mạnh: {strong_count}/{total_topics} | Chủ đề yếu: {weak_count}
- Chủ đề cần cải thiện: {', '.join(weak_topics) if weak_topics else 'chưa xác định'}
- Thời gian học mỗi ngày: {daily_study_time} phút
- Chế độ học: {mode or 'cân bằng'}
- Lộ trình đang theo: {scenario_name or 'chưa chọn'}
- Chủ đề tuần này: {current_week_theme or 'chưa xác định'}

"""

        prompt = f"""Bạn là Routex AI Chatbot - trợ lý học tập thông minh, thân thiện cho học sinh THPT Việt Nam.
{system_ctx}Hãy trả lời ngắn gọn (tối đa 150 từ), dễ hiểu, dùng tiếng Việt tự nhiên như người thầy thân thiện.
Khi giải thích toán/lý/hóa, hãy dùng ví dụ cụ thể, dễ nhớ. Luôn khuyến khích học sinh.
Nếu học sinh hỏi về tiến độ, điểm yếu, lộ trình — dùng thông tin trên để trả lời cụ thể, đừng nói chung chung.

Câu hỏi của học sinh: {message}"""

        result = await self._call(prompt)
        return result if result else "Xin lỗi, mình đang bận xíu! Thử lại sau nhé 😅"


llm_service = LLMService()

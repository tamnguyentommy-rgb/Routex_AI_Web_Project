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
    'gemini-1.5-flash',
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

def _is_rate_limit(err: str) -> bool:
    return any(x in err for x in ("429", "RESOURCE_EXHAUSTED", "quota", "rate", "limit", "overloaded", "503", "busy"))

def _is_not_found(err: str) -> bool:
    return any(x in err.upper() for x in ("404", "NOT_FOUND", "model_not_found"))

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
        for key in _GEMINI_KEYS:
            client = self._get_gemini_client(key)
            for model in _GEMINI_MODELS:
                try:
                    response = await client.aio.models.generate_content(
                        model=model,
                        contents=prompt,
                        config={"max_output_tokens": 8192, "temperature": 0.7},
                    )
                    return response.text
                except Exception as e:
                    err = str(e)
                    if _is_not_found(err):
                        continue
                    if _is_rate_limit(err):
                        break
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
                        max_tokens=8192,
                    )
                    return chat.choices[0].message.content
                except Exception as e:
                    err = str(e)
                    if _is_not_found(err):
                        continue
                    if _is_rate_limit(err):
                        break
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
                        max_tokens=8192,
                    )
                    return chat.choices[0].message.content
                except Exception as e:
                    err = str(e)
                    if _is_not_found(err):
                        continue
                    if _is_rate_limit(err):
                        break
                    continue
        return None

    async def _call(self, prompt: str) -> str | None:
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

    async def _generate_week_chunk(
        self,
        subject: str,
        grade: int,
        scenario_name: str,
        topic_count: int,
        planned_time: int,
        avg_difficulty: float,
        current_score: float,
        weak_ratio: int,
        total_weeks: int,
        chunk_weeks: list,
    ) -> list:
        """Generate a small chunk of weeks (1-3) so the JSON stays well under
        any single-call output token cap. Returns a list of week dicts (may be
        empty on failure)."""
        first_week = chunk_weeks[0]
        last_week = chunk_weeks[-1]
        if first_week == last_week:
            range_text = f"tuần {first_week}"
        else:
            range_text = f"các tuần {first_week} đến {last_week}"

        if first_week == 1:
            phase_hint = "đây là giai đoạn đầu — tập trung xây nền tảng và ôn lại kiến thức gốc"
        elif last_week >= total_weeks:
            phase_hint = "đây là giai đoạn cuối — tập trung tổng ôn, đề thi thử và chiến thuật làm bài"
        else:
            phase_hint = "đây là giai đoạn giữa — luyện sâu các dạng bài quan trọng"

        prompt = (
            f"Bạn là Routex AI, trợ lý học tập thông minh.\n"
            f"Học sinh đang theo \"{scenario_name}\" với:\n"
            f"- Môn học: {subject} lớp {grade}\n"
            f"- Điểm hiện tại: {current_score}/10\n"
            f"- Tỷ lệ điểm yếu: {weak_ratio}%\n"
            f"- Số chủ đề mỗi tuần: {topic_count}\n"
            f"- Thời gian học: {planned_time} phút/tuần\n"
            f"- Độ khó: {avg_difficulty * 10:.1f}/10\n"
            f"- Tổng thời gian ôn tập: {total_weeks} tuần\n\n"
            f"Hãy soạn nội dung CHI TIẾT chỉ cho {range_text} (trên tổng {total_weeks} tuần). "
            f"{phase_hint}. Mỗi tuần phải có đúng {topic_count} chủ đề thực tế của môn {subject} lớp {grade}.\n\n"
            "Trả về JSON DUY NHẤT theo định dạng (không markdown, không text thêm):\n"
            "{\n"
            "  \"weeks\": [\n"
            "    {\n"
            "      \"week\": <số tuần>,\n"
            "      \"theme\": \"Tên theme ngắn gọn\",\n"
            "      \"goal\": \"Mục tiêu cụ thể của tuần\",\n"
            "      \"topics\": [\n"
            "        {\n"
            "          \"name\": \"Tên chủ đề\",\n"
            "          \"subtopics\": [\"sub 1\", \"sub 2\", \"sub 3\"],\n"
            "          \"time_minutes\": 90,\n"
            "          \"difficulty\": 0.5,\n"
            "          \"key_idea\": \"Ý tưởng chính cần nhớ\"\n"
            "        }\n"
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
            f"Mảng \"weeks\" phải có đúng {len(chunk_weeks)} phần tử, mỗi phần tử có đúng {topic_count} chủ đề. "
            f"Trường \"week\" phải lần lượt là: {chunk_weeks}. Chỉ JSON thuần túy."
        )

        text = await self._call_json(prompt)
        if not text:
            print(f"[LLM] week-chunk {chunk_weeks} returned empty")
            return []
        try:
            data = json.loads(text)
        except Exception as e:
            print(f"[LLM] week-chunk {chunk_weeks} JSON error: {e}; raw_tail={text[-200:]}")
            return []
        weeks = data.get("weeks") if isinstance(data, dict) else None
        if not isinstance(weeks, list):
            return []
        return [w for w in weeks if isinstance(w, dict) and w.get("topics")]

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
        # Honor the EXACT number of weeks the user chose at onboarding
        # (examDurationWeeks) — no fixed 12-week cap. Hard upper bound of 52
        # weeks (1 year) just to keep one user from queuing hundreds of LLM
        # calls; the onboarding date picker already caps at +1 year.
        try:
            total_weeks = max(1, int(user_config.get("duration_weeks", 4)))
        except Exception:
            total_weeks = 4
        total_weeks = min(total_weeks, 52)

        # Pick chunk size so each LLM call stays small enough to NEVER hit the
        # output-token cap, even for "Bứt phá" (7 topics per week).
        if topic_count >= 6:
            chunk_size = 1
        elif topic_count >= 4:
            chunk_size = 2
        else:
            chunk_size = 3

        all_week_numbers = list(range(1, total_weeks + 1))
        chunks = [
            all_week_numbers[i : i + chunk_size]
            for i in range(0, len(all_week_numbers), chunk_size)
        ]

        # Throttle concurrency so long plans (e.g. 24+ weeks) don't fan out
        # 20+ simultaneous calls and trigger provider rate-limits. 4 in
        # flight at once is a good balance of speed and politeness.
        sem = asyncio.Semaphore(4)

        async def _run(chunk):
            async with sem:
                return await self._generate_week_chunk(
                    subject=subject,
                    grade=grade,
                    scenario_name=scenario_name,
                    topic_count=topic_count,
                    planned_time=planned_time,
                    avg_difficulty=avg_difficulty,
                    current_score=current_score,
                    weak_ratio=weak_ratio,
                    total_weeks=total_weeks,
                    chunk_weeks=chunk,
                )

        results = await asyncio.gather(
            *[_run(chunk) for chunk in chunks],
            return_exceptions=True,
        )

        merged_weeks: list = []
        for r in results:
            if isinstance(r, list):
                merged_weeks.extend(r)

        # Sort and de-dupe by week number, then renumber sequentially in case
        # the LLM repeated or skipped a number.
        seen = {}
        for w in merged_weeks:
            try:
                n = int(w.get("week", 0))
            except Exception:
                n = 0
            if n and n not in seen:
                seen[n] = w
        ordered = [seen[k] for k in sorted(seen.keys())]
        for idx, w in enumerate(ordered, start=1):
            w["week"] = idx

        if not ordered:
            return {
                "scenario_name": scenario_name,
                "subject": subject,
                "grade": grade,
                "total_weeks": total_weeks,
                "error": "all_chunks_failed",
                "weeks": [],
            }

        return {
            "scenario_name": scenario_name,
            "subject": subject,
            "grade": grade,
            "total_weeks": total_weeks,
            "weeks": ordered,
        }

    async def generate_mcq_batch(self, subject: str, grade: int, topic: str, current_score: float, count: int = 5) -> list:
        """Generate `count` MCQs in one shot, scaled to the student's score."""
        try:
            score = float(current_score)
        except Exception:
            score = 5.0

        if score < 5.0:
            level_desc = "ở mức cơ bản, dễ tiếp cận, củng cố kiến thức nền"
            difficulty = 0.3
        elif score < 7.0:
            level_desc = "ở mức trung bình, vận dụng kiến thức cơ bản"
            difficulty = 0.5
        elif score < 8.5:
            level_desc = "ở mức khá, vận dụng và phân tích sâu hơn"
            difficulty = 0.7
        else:
            level_desc = "ở mức nâng cao, đòi hỏi tư duy và tổng hợp"
            difficulty = 0.85

        prompt = (
            f"Bạn là giáo viên THPT Việt Nam có kinh nghiệm soạn đề trắc nghiệm.\n"
            f"Hãy soạn {count} câu hỏi trắc nghiệm môn {subject} lớp {grade}, "
            f"chủ đề \"{topic}\", {level_desc}.\n"
            f"Học sinh có điểm hiện tại {score}/10.\n\n"
            "Yêu cầu:\n"
            "1. Mỗi câu có 4 đáp án A, B, C, D rõ ràng, chính xác về khoa học.\n"
            "2. Ba đáp án sai phải hợp lý (dễ nhầm với đáp án đúng), không quá hiển nhiên.\n"
            "3. Có giải thích ngắn gọn 2-3 câu vì sao đáp án đúng là đúng.\n"
            f"4. Câu hỏi phải đúng chủ đề \"{topic}\" và đúng mức độ {level_desc}.\n"
            "5. Không lặp lại câu hỏi giống nhau, đa dạng dạng bài.\n"
            "6. Đáp án đúng phải phân bố đều giữa A, B, C, D (không tập trung vào một chữ).\n\n"
            "Trả về JSON theo ĐÚNG định dạng (không markdown, không text thêm):\n"
            "{\n"
            "  \"questions\": [\n"
            "    {\n"
            "      \"content\": \"Nội dung câu hỏi 1\",\n"
            "      \"A\": \"Lựa chọn A\",\n"
            "      \"B\": \"Lựa chọn B\",\n"
            "      \"C\": \"Lựa chọn C\",\n"
            "      \"D\": \"Lựa chọn D\",\n"
            "      \"correct\": \"A\",\n"
            "      \"explanation\": \"Giải thích ngắn gọn vì sao đáp án đúng\",\n"
            f"      \"difficulty\": {difficulty}\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
            f"Phải trả về đủ {count} câu trong mảng \"questions\". Chỉ JSON thuần túy."
        )

        text = await self._call_json(prompt)
        if not text:
            return []
        try:
            data = json.loads(text)
        except Exception as e:
            print(f"[LLM] generate_mcq_batch JSON parse error: {e}; raw={text[:200]}")
            return []

        if isinstance(data, dict):
            items = data.get("questions") or []
        elif isinstance(data, list):
            items = data
        else:
            items = []
        return [q for q in items if isinstance(q, dict) and q.get("content")]

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

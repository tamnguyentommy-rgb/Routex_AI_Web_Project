import json
import asyncio
import unicodedata
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from app.db.session import get_db
from app.models.assessment import Question, Test, UserAnswer, test_questions
from app.models.curriculum import Topic
from app.models.progress import UserMastery, WeeklyProgress, LearningPath
from app.models.user import User
from app.schemas.assessment import TestOut, QuestionOut, TestSubmit, TestResult, AnswerResult
from app.services.llm_service import llm_service

def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s) if s else s

router = APIRouter()


async def _ensure_mcq(question: Question, db: Session) -> Question:
    """If question has no options, call LLM to generate them."""
    if question.option_a:
        return question
    try:
        prompt = f"""Bạn là giáo viên THPT Việt Nam chuyên soạn đề trắc nghiệm. Hãy chuyển câu hỏi tự luận sau thành câu trắc nghiệm 4 lựa chọn A, B, C, D rõ ràng, chuẩn xác cho học sinh lớp 10-12.

Câu hỏi gốc: "{question.content}"

Yêu cầu:
1. Đáp án đúng phải chính xác về mặt khoa học.
2. Ba đáp án sai phải hợp lý, có vẻ đúng (không quá dễ nhận ra), để thực sự kiểm tra hiểu biết.
3. Mỗi đáp án phải đủ ý, rõ nghĩa (1-2 câu nếu cần), không quá 40 từ.
4. Giải thích tại sao đáp án đúng là đúng, và tại sao các đáp án sai lại không đúng (2-3 câu ngắn gọn).

Trả về JSON theo đúng định dạng sau (không thêm bất kỳ text nào khác):
{{
  "A": "Nội dung lựa chọn A",
  "B": "Nội dung lựa chọn B",
  "C": "Nội dung lựa chọn C",
  "D": "Nội dung lựa chọn D",
  "correct": "A",
  "explanation": "Đáp án [X] đúng vì... Các đáp án còn lại sai vì..."
}}"""

        raw = await llm_service._call_json(prompt)
        if not raw:
            raise Exception("LLM không trả về kết quả")

        data = json.loads(raw.strip())

        question.option_a = data.get("A", "")
        question.option_b = data.get("B", "")
        question.option_c = data.get("C", "")
        question.option_d = data.get("D", "")
        question.correct_answer = data.get("correct", "A")
        question.explanation = data.get("explanation", "")
        db.commit()
    except Exception as e:
        question.option_a = "Câu hỏi này chưa có đáp án – vui lòng thử lại"
        question.option_b = "Kiểm tra kết nối API"
        question.option_c = "Lỗi tạo đáp án tự động"
        question.option_d = "Hãy liên hệ quản trị viên"
        question.correct_answer = "A"
        question.explanation = f"Lỗi hệ thống khi tạo đáp án: {str(e)}"
        db.commit()
    return question


@router.get("/generate", response_model=TestOut)
async def generate_test(
    subject: str,
    grade: int,
    limit: int = 10,
    topic: Optional[str] = None,
    db: Session = Depends(get_db)
):
    subject = nfc(subject)

    base = db.query(Question).join(Topic).filter(
        Topic.subject == subject,
        Topic.grade == grade
    )

    if topic:
        topic_nfc = nfc(topic)
        # Strict topic-only mini test: try exact then case-insensitive partial match.
        questions = base.filter(Topic.name == topic_nfc).order_by(func.random()).limit(limit).all()
        if not questions:
            like = f"%{topic_nfc}%"
            questions = base.filter(Topic.name.ilike(like)).order_by(func.random()).limit(limit).all()
        if not questions:
            raise HTTPException(
                status_code=404,
                detail=f"Chưa có câu hỏi cho chủ đề \"{topic_nfc}\" ({subject} lớp {grade}). Hãy thử lại sau hoặc chọn chủ đề khác."
            )
    else:
        questions = base.order_by(func.random()).limit(limit).all()
        if not questions:
            raise HTTPException(status_code=404, detail=f"Không có câu hỏi nào cho {subject} lớp {grade}. Hãy chạy seed trước!")

    enriched = await asyncio.gather(*[_ensure_mcq(q, db) for q in questions])

    new_test = Test(user_id=1, week=0)
    db.add(new_test)
    db.flush()
    for q in enriched:
        db.execute(test_questions.insert().values(test_id=new_test.id, question_id=q.id))
    db.commit()
    db.refresh(new_test)

    return TestOut(
        test_id=new_test.id,
        questions=[QuestionOut(
            id=q.id,
            content=q.content,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            topic_id=q.topic_id
        ) for q in enriched]
    )


@router.get("/generate_mini", response_model=TestOut)
async def generate_mini_test(
    subject: str,
    grade: int,
    topic: str,
    user_id: int,
    week: Optional[int] = None,
    limit: int = 5,
    db: Session = Depends(get_db),
):
    """Generate a fresh AI-authored mini test for a roadmap week.

    Always uses the LLM so questions match the user's grade, current score,
    and the exact topic of that week — even if no seeded questions exist.
    """
    subject = nfc(subject)
    topic_nfc = nfc(topic)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User không tồn tại!")
    current_score = float(user.current_score or 5.0)
    eff_grade = int(grade or user.grade or 12)

    # Find or create the topic so submission can update mastery/learning path.
    target_topic = (
        db.query(Topic)
        .filter(Topic.subject == subject, Topic.grade == eff_grade, Topic.name == topic_nfc)
        .first()
    )
    if not target_topic:
        target_topic = (
            db.query(Topic)
            .filter(Topic.subject == subject, Topic.grade == eff_grade, Topic.name.ilike(f"%{topic_nfc}%"))
            .first()
        )
    if not target_topic:
        target_topic = Topic(
            subject=subject,
            grade=eff_grade,
            name=topic_nfc,
            description=f"Chủ đề mini test tự sinh: {topic_nfc}",
        )
        db.add(target_topic)
        db.flush()

    questions_data = await llm_service.generate_mcq_batch(
        subject=subject,
        grade=eff_grade,
        topic=topic_nfc,
        current_score=current_score,
        count=limit,
    )
    if not questions_data:
        raise HTTPException(
            status_code=503,
            detail="AI đang bận tạo câu hỏi. Vui lòng thử lại sau ít phút!",
        )

    new_test = Test(user_id=user_id, week=week or 0)
    db.add(new_test)
    db.flush()

    out_questions: list[Question] = []
    for qd in questions_data[:limit]:
        correct = (qd.get("correct") or "A").strip().upper()
        if correct not in ("A", "B", "C", "D"):
            correct = "A"
        try:
            diff = float(qd.get("difficulty", 0.5))
        except Exception:
            diff = 0.5

        q = Question(
            topic_id=target_topic.id,
            content=qd.get("content", "").strip(),
            option_a=qd.get("A", "").strip(),
            option_b=qd.get("B", "").strip(),
            option_c=qd.get("C", "").strip(),
            option_d=qd.get("D", "").strip(),
            correct_answer=correct,
            explanation=(qd.get("explanation") or "").strip(),
            difficulty=diff,
        )
        db.add(q)
        db.flush()
        db.execute(test_questions.insert().values(test_id=new_test.id, question_id=q.id))
        out_questions.append(q)

    if not out_questions:
        db.rollback()
        raise HTTPException(status_code=503, detail="AI trả về dữ liệu không hợp lệ. Thử lại nhé!")

    db.commit()
    db.refresh(new_test)

    return TestOut(
        test_id=new_test.id,
        questions=[
            QuestionOut(
                id=q.id,
                content=q.content,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                topic_id=q.topic_id,
            )
            for q in out_questions
        ],
    )


@router.post("/submit", response_model=TestResult)
def submit_test(user_id: int, payload: TestSubmit, db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == payload.test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test không tồn tại!")

    if payload.week is not None:
        test.week = payload.week
        test.user_id = user_id

    correct_count = 0
    results = []
    weak_topic_ids = set()

    for ans in payload.answers:
        q = db.query(Question).filter(Question.id == ans.question_id).first()
        if not q:
            continue

        is_correct = (ans.selected_answer == q.correct_answer)
        if is_correct:
            correct_count += 1
        else:
            weak_topic_ids.add(q.topic_id)

        db.add(UserAnswer(
            test_id=payload.test_id,
            question_id=ans.question_id,
            user_id=user_id,
            selected_option=ans.selected_answer,
            is_correct=is_correct
        ))

        mastery = db.query(UserMastery).filter(
            UserMastery.user_id == user_id,
            UserMastery.topic_id == q.topic_id
        ).first()
        if not mastery:
            mastery = UserMastery(user_id=user_id, topic_id=q.topic_id, mastery=0.0)
            db.add(mastery)
            db.flush()

        mastery.mastery = min(1.0, mastery.mastery + 0.1) if is_correct else max(0.0, mastery.mastery - 0.05)

        results.append(AnswerResult(
            question_id=ans.question_id,
            selected_answer=ans.selected_answer,
            is_correct=is_correct,
            correct_answer=q.correct_answer or "A",
            explanation=q.explanation or ""
        ))

    total = len(payload.answers)
    score = round((correct_count / total) * 10, 2) if total > 0 else 0.0
    test.score = score

    # For mini tests tied to a roadmap week, log progress and (if passed)
    # mark the week's topic as completed so the dashboard advances. We never
    # generate a new roadmap here — the user keeps the roadmap chosen at signup.
    if payload.is_mini_test and payload.week is not None:
        wp = db.query(WeeklyProgress).filter(
            WeeklyProgress.user_id == user_id,
            WeeklyProgress.week == payload.week,
        ).first()
        if not wp:
            wp = WeeklyProgress(user_id=user_id, week=payload.week, score=score, study_time=0.0)
            db.add(wp)
        else:
            wp.score = max(wp.score or 0.0, score)

        if payload.topic_name:
            topic_nfc = nfc(payload.topic_name)
            target_topic = db.query(Topic).filter(Topic.name == topic_nfc).first()
            if not target_topic:
                target_topic = db.query(Topic).filter(Topic.name.ilike(f"%{topic_nfc}%")).first()

            if target_topic:
                lp = db.query(LearningPath).filter(
                    LearningPath.user_id == user_id,
                    LearningPath.week == payload.week,
                    LearningPath.topic_id == target_topic.id,
                ).first()
                # Pass threshold: 7/10 marks the week's topic as completed.
                new_status = "completed" if score >= 7.0 else "in_progress"
                if not lp:
                    lp = LearningPath(
                        user_id=user_id,
                        week=payload.week,
                        topic_id=target_topic.id,
                        status=new_status,
                    )
                    db.add(lp)
                else:
                    # Don't downgrade an already-completed topic.
                    if lp.status != "completed":
                        lp.status = new_status

    db.commit()

    weak_topics = []
    for tid in weak_topic_ids:
        t = db.query(Topic).filter(Topic.id == tid).first()
        if t:
            weak_topics.append(t.name)

    return TestResult(
        test_id=payload.test_id,
        total_questions=total,
        correct_count=correct_count,
        score=score,
        results=results,
        weak_topics=weak_topics
    )

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.user import User
from app.models.progress import UserMastery, WeeklyProgress, LearningPath
from app.models.curriculum import Topic
from app.models.config import LearningConfig

router = APIRouter()

@router.get("/{user_id}")
def get_dashboard(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user!")

    cfg = db.query(LearningConfig).filter(LearningConfig.user_id == user_id).first()

    masteries = db.query(UserMastery, Topic).join(Topic).filter(
        UserMastery.user_id == user_id
    ).all()

    mastery_list = [
        {"topic": t.name, "subject": t.subject, "grade": t.grade, "mastery": round(m.mastery * 100)}
        for m, t in masteries
    ]

    weak_topics = [x for x in mastery_list if x["mastery"] < 50]
    strong_topics = [x for x in mastery_list if x["mastery"] >= 70]

    avg_mastery = round(sum(x["mastery"] for x in mastery_list) / len(mastery_list)) if mastery_list else 0
    weak_ratio = round(len(weak_topics) / len(mastery_list) * 100) if mastery_list else 0

    weekly = db.query(WeeklyProgress).filter(WeeklyProgress.user_id == user_id).order_by(
        WeeklyProgress.week
    ).all()
    weekly_data = [{"week": w.week, "score": w.score, "study_time": w.study_time} for w in weekly]

    path = db.query(LearningPath, Topic).join(Topic).filter(
        LearningPath.user_id == user_id
    ).order_by(LearningPath.week, LearningPath.path_id).all()
    path_data = [{"topic": t.name, "week": lp.week, "status": lp.status} for lp, t in path]

    return {
        "user": {"id": user.id, "username": user.username, "grade": user.grade},
        "config": {
            "subject": cfg.subject if cfg else None,
            "grade": cfg.grade if cfg else None,
            "mode": cfg.mode if cfg else None,
            "target_score": cfg.target_score if cfg else None
        } if cfg else None,
        "overview": {
            "avg_mastery": avg_mastery,
            "weak_ratio": weak_ratio,
            "total_topics": len(mastery_list),
            "weak_count": len(weak_topics),
            "strong_count": len(strong_topics)
        },
        "mastery_topics": mastery_list,
        "weak_topics": weak_topics[:10],
        "weekly_progress": weekly_data,
        "learning_path": path_data
    }

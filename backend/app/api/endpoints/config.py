from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.config import LearningConfig
from app.models.user import User
from app.schemas.config import ConfigCreate, ConfigResponse

router = APIRouter()

@router.post("/{user_id}", response_model=ConfigResponse)
def save_config(user_id: int, config: ConfigCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user!")

    existing = db.query(LearningConfig).filter(LearningConfig.user_id == user_id).first()
    if existing:
        for k, v in config.model_dump(exclude_unset=True).items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing

    new_config = LearningConfig(user_id=user_id, **config.model_dump())
    db.add(new_config)

    user.grade = config.grade
    db.commit()
    db.refresh(new_config)
    return new_config

@router.get("/{user_id}", response_model=ConfigResponse)
def get_config(user_id: int, db: Session = Depends(get_db)):
    cfg = db.query(LearningConfig).filter(LearningConfig.user_id == user_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Chưa có config!")
    return cfg

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()

class AvatarUpload(BaseModel):
    avatar_data: str

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user!")
    return user

@router.post("/{user_id}/avatar")
def upload_avatar(user_id: int, payload: AvatarUpload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user!")
    user.avatar_data = payload.avatar_data
    db.commit()
    return {"status": "ok"}

@router.get("/{user_id}/avatar")
def get_avatar(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user!")
    return {"avatar_data": user.avatar_data or ""}

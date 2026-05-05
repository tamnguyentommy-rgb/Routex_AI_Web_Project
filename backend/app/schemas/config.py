from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ConfigCreate(BaseModel):
    subject: str = Field(..., example="Toán")
    grade: int = Field(..., ge=10, le=12, example=12)
    mode: str = Field(..., example="exam")
    target_score: Optional[float] = Field(8.0, ge=0, le=10)
    daily_study_time: Optional[float] = Field(60.0)

class ConfigResponse(ConfigCreate):
    config_id: int
    user_id: int
    deadline: Optional[datetime] = None

    class Config:
        from_attributes = True

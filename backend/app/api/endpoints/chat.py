from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.llm_service import llm_service

router = APIRouter(redirect_slashes=False)

class ChatRequest(BaseModel):
    message: str
    user_context: dict = {}

@router.post("")
@router.post("/")
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn không được rỗng!")
    reply = await llm_service.chat(request.message, request.user_context)
    return {"status": "success", "reply": reply}

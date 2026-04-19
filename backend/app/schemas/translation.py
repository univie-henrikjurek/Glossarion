from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Any


class TranslationCreate(BaseModel):
    language_code: str = Field(..., min_length=2, max_length=10)
    text: str = Field(..., min_length=1)
    status: str = "auto"


class TranslationUpdate(BaseModel):
    text: str | None = None
    status: str | None = None
    word_type: Optional[str] = None
    gender: Optional[str] = None
    article: Optional[str] = None
    grammar_details: Optional[Any] = None
    sign_language_url: Optional[str] = None


class TranslationResponse(BaseModel):
    id: str
    entry_id: str
    language_code: str
    text: str
    status: str
    word_type: Optional[str] = None
    gender: Optional[str] = None
    article: Optional[str] = None
    grammar_details: Optional[Any] = None
    sign_language_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

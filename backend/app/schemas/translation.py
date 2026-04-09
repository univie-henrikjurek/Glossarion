from datetime import datetime
from pydantic import BaseModel, Field


class TranslationCreate(BaseModel):
    language_code: str = Field(..., min_length=2, max_length=10)
    text: str = Field(..., min_length=1)
    status: str = "auto"


class TranslationUpdate(BaseModel):
    text: str | None = None
    status: str | None = None


class TranslationResponse(BaseModel):
    id: str
    entry_id: str
    language_code: str
    text: str
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

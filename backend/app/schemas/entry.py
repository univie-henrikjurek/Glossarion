from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class EntryBase(BaseModel):
    context: Optional[str] = None
    tags: list[str] = Field(default_factory=list)


class EntryCreate(EntryBase):
    pass


class EntryUpdate(BaseModel):
    context: Optional[str] = None
    tags: Optional[list[str]] = None


class TranslationInEntry(BaseModel):
    language_code: str
    text: str
    status: str = "auto"


class EntryResponse(BaseModel):
    id: str
    context: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    translations: list = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Translation(Base):
    __tablename__ = "translations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entry_id = Column(String(36), ForeignKey("entries.id", ondelete="CASCADE"), nullable=False)
    language_code = Column(String(10), nullable=False)
    text = Column(Text, nullable=False)
    status = Column(String(20), default="auto")
    word_type = Column(String(20), nullable=True)
    gender = Column(String(10), nullable=True)
    article = Column(String(20), nullable=True)
    grammar_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint("entry_id", "language_code", "text", name="uq_entry_language_text"),
    )
    
    entry = relationship("Entry", back_populates="translations")
    
    def __repr__(self):
        return f"<Translation {self.id}: {self.language_code}>"

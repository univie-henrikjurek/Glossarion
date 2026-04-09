import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Entry(Base):
    __tablename__ = "entries"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    context = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    translations = relationship(
        "Translation",
        back_populates="entry",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    
    def __repr__(self):
        return f"<Entry {self.id}>"

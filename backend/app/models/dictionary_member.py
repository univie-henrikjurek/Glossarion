import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class DictionaryMember(Base):
    __tablename__ = "dictionary_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dictionary_id = Column(UUID(as_uuid=True), ForeignKey("dictionaries.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False, default="editor")  # owner, editor, viewer
    invited_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="dictionary_memberships")
    dictionary = relationship("Dictionary", back_populates="members")

    __table_args__ = (
        UniqueConstraint('dictionary_id', 'user_id', name='uq_dictionary_user'),
    )

    def __repr__(self):
        return f"<DictionaryMember {self.dictionary_id}:{self.user_id} ({self.role})>"

import uuid
import secrets
from datetime import datetime, timedelta
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dictionary_id = Column(UUID(as_uuid=True), ForeignKey("dictionaries.id"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    role = Column(String(20), nullable=False, default="editor")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    accepted = Column(String(10), default="pending")  # pending, accepted, declined
    accepted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dictionary = relationship("Dictionary")
    creator = relationship("User", foreign_keys=[created_by])
    acceptor = relationship("User", foreign_keys=[accepted_by])

    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(48)

    @staticmethod
    def get_expiry(days=7):
        return datetime.utcnow() + timedelta(days=days)

    def is_expired(self):
        return datetime.utcnow() > self.expires_at

    def __repr__(self):
        return f"<Invitation {self.token[:8]}... for {self.dictionary_id}>"

"""Modelos SQLAlchemy: Quote (cotización) y QuoteHistory (historial de acciones)."""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Text,
    Enum as SAEnum,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class QuoteStatus(str, enum.Enum):
    """Estados de una cotización."""

    DRAFT = "draft"
    SENT = "sent"
    SIGNED = "signed"


class Quote(Base):
    """Cotización formal generada a partir de un presupuesto y enviada al cliente."""

    __tablename__ = "quotes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    budget_version = Column(Integer, nullable=False, default=1)
    pdf_url = Column(Text, nullable=True)  # ruta local o URL del PDF
    status = Column(
        SAEnum(QuoteStatus),
        nullable=False,
        default=QuoteStatus.DRAFT,
    )
    creator_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relaciones
    project = relationship("Project", backref="quotes")
    creator = relationship("User", backref="quotes")
    history = relationship(
        "QuoteHistory", back_populates="quote", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<Quote {self.id[:8]}... "
            f"project={self.project_id[:8]}... "
            f"v{self.budget_version} [{self.status.value}]>"
        )


class QuoteHistory(Base):
    """Historial de acciones realizadas sobre una cotización (auditoría)."""

    __tablename__ = "quote_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quote_id = Column(
        String(36),
        ForeignKey("quotes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action = Column(String(50), nullable=False, index=True)  # created, sent, signed
    performed_by = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    metadata_json = Column(JSON, nullable=True)  # datos extra opcionales
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relaciones
    quote = relationship("Quote", back_populates="history")
    performer = relationship("User", backref="quote_actions")

    def __repr__(self) -> str:
        return (
            f"<QuoteHistory {self.id[:8]}... "
            f"quote={self.quote_id[:8]}... "
            f"action={self.action}>"
        )

"""
Modelos SQLAlchemy: Signature (firma digital) y SignatureEvidence (evidencia legal).

- Signature: registro de firma con trazabilidad completa (IP, user-agent, hash).
- SignatureEvidence: evidencia granular por tipo (ip, timestamp, user_agent, pdf_hash, signature).
"""

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
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class SignatureStatus(str, enum.Enum):
    """Estados de una solicitud de firma."""

    PENDING = "pending"
    SIGNED = "signed"
    REJECTED = "rejected"


class Signature(Base):
    """Firma digital de un presupuesto de proyecto."""

    __tablename__ = "signatures"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    budget_version = Column(Integer, nullable=False, default=1)
    signer_name = Column(String(255), nullable=True)
    signer_email = Column(String(255), nullable=True)
    signer_ip = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    signature_image = Column(Text, nullable=True)  # base64 PNG
    pdf_hash = Column(String(64), nullable=True)  # SHA-256 del PDF firmado
    signed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        SAEnum(SignatureStatus),
        nullable=False,
        default=SignatureStatus.PENDING,
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
    project = relationship("Project", backref="signatures")
    evidence = relationship(
        "SignatureEvidence", back_populates="signature", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<Signature {self.id[:8]}... "
            f"project={self.project_id[:8]}... "
            f"[{self.status.value}]>"
        )


class SignatureEvidence(Base):
    """Evidencia legal granular asociada a una firma digital."""

    __tablename__ = "signature_evidence"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    signature_id = Column(
        String(36),
        ForeignKey("signatures.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_type = Column(
        String(50),
        nullable=False,
        index=True,
    )  # ip, timestamp, user_agent, pdf_hash, signature
    evidence_value = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relación
    signature = relationship("Signature", back_populates="evidence")

    def __repr__(self) -> str:
        return (
            f"<SignatureEvidence {self.id[:8]}... "
            f"type={self.evidence_type}>"
        )

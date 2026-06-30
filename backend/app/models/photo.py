"""
Modelo SQLAlchemy: Photo (evidencia fotográfica de proyecto).

Cada foto pertenece a un proyecto y se almacena en Supabase Storage
(o filesystem local como fallback). Los metadatos EXIF/GPS se eliminan
automáticamente antes de guardar.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Photo(Base):
    """Foto de evidencia asociada a un proyecto de herrería."""

    __tablename__ = "photos"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url = Column(Text, nullable=False, comment="URL en Supabase Storage o filesystem local")
    original_filename = Column(
        String(500), nullable=True, comment="Nombre original del archivo subido"
    )
    order = Column(Integer, nullable=False, default=0, comment="Posición en la galería")
    exif_stripped = Column(
        Boolean, nullable=False, default=True, comment="True si se limpiaron metadatos EXIF/GPS"
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Relaciones ──────────────────────────────────────────────────

    project = relationship("Project", back_populates="photos")

    # ── Representación ──────────────────────────────────────────────

    def __repr__(self) -> str:
        return (
            f"<Photo {self.id[:8]}... "
            f"project={self.project_id[:8]}... "
            f"order={self.order}>"
        )

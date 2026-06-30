"""
Modelos SQLAlchemy para los catálogos del Sprint 4:
- AluminumSeries: series de aluminio disponibles
- Finish: tipos de acabado
- GlassType: tipos de vidrio
- Hardware: herrajes y accesorios
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text
from app.core.database import Base


# ── Series de Aluminio ─────────────────────────────────────────────

class AluminumSeries(Base):
    """Catálogo de series de aluminio (ej. Línea 25, Línea Europea, etc.)."""

    __tablename__ = "aluminum_series"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    price_per_m2 = Column(Float, nullable=False, default=0.0)
    is_active = Column(Boolean, nullable=False, default=True)
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

    def __repr__(self) -> str:
        return f"<AluminumSeries {self.name} ${self.price_per_m2}/m²>"


# ── Acabados ───────────────────────────────────────────────────────

class Finish(Base):
    """Catálogo de tipos de acabado (natural, anodizado, pintado, madera)."""

    __tablename__ = "finishes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True)
    price_per_m2 = Column(Float, nullable=False, default=0.0)
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

    def __repr__(self) -> str:
        return f"<Finish {self.name} ${self.price_per_m2}/m²>"


# ── Tipos de Vidrio ────────────────────────────────────────────────

class GlassType(Base):
    """Catálogo de tipos de vidrio (claro, templado, laminado, etc.)."""

    __tablename__ = "glass_types"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True)
    price_per_m2 = Column(Float, nullable=False, default=0.0)
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

    def __repr__(self) -> str:
        return f"<GlassType {self.name} ${self.price_per_m2}/m²>"


# ── Herrajes ───────────────────────────────────────────────────────

class Hardware(Base):
    """Catálogo de herrajes y accesorios (manijas, bisagras, cerraduras, etc.)."""

    __tablename__ = "hardware"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    price_per_unit = Column(Float, nullable=False, default=0.0)
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

    def __repr__(self) -> str:
        return f"<Hardware {self.name} ${self.price_per_unit}/u>"

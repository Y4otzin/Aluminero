"""Modelo SQLAlchemy: LaborCost (costo de mano de obra por tipo de trabajo)."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Boolean, UniqueConstraint
from app.core.database import Base


class LaborCost(Base):
    """Costo de mano de obra por tipo de trabajo (ej. ventana, puerta, etc.)."""

    __tablename__ = "labor_costs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_type = Column(String(100), unique=True, nullable=False, index=True)
    cost_per_m2 = Column(Float, nullable=False)  # costo por metro cuadrado
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

    __table_args__ = (UniqueConstraint("job_type", name="uq_labor_cost_job_type"),)

    def __repr__(self) -> str:
        return f"<LaborCost {self.job_type}: {self.cost_per_m2}>"
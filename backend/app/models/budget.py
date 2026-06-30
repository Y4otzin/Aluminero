"""Modelos para presupuestos y costos de mano de obra."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Table, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base


# Tabla intermedia many-to-many: Budget → Hardware
budget_hardware = Table(
    "budget_hardware",
    Base.metadata,
    Column("budget_id", String(36), ForeignKey("budgets.id", ondelete="CASCADE"), primary_key=True),
    Column("hardware_id", String(36), ForeignKey("hardware.id", ondelete="CASCADE"), primary_key=True),
)


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    aluminum_series_id = Column(String(36), ForeignKey("aluminum_series.id", ondelete="SET NULL"), nullable=True)
    finish_id = Column(String(36), ForeignKey("finishes.id", ondelete="SET NULL"), nullable=True)
    glass_type_id = Column(String(36), ForeignKey("glass_types.id", ondelete="SET NULL"), nullable=True)
    height_m = Column(Float, nullable=False)
    width_m = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    area_m2 = Column(Float, nullable=False)
    material_cost = Column(Float, nullable=False, default=0.0)
    labor_cost = Column(Float, nullable=False, default=0.0)
    subtotal = Column(Float, nullable=False, default=0.0)
    tax = Column(Float, nullable=False, default=0.0)
    total = Column(Float, nullable=False, default=0.0)
    discount_pct = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True)
    is_current = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relaciones
    project = relationship("Project", back_populates="budgets")
    aluminum_series = relationship("AluminumSeries")
    finish = relationship("Finish")
    glass_type = relationship("GlassType")
    hardware = relationship("Hardware", secondary=budget_hardware, lazy="selectin")


class LaborCost(Base):
    __tablename__ = "labor_costs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_type = Column(String(100), unique=True, nullable=False, index=True)
    cost_per_m2 = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

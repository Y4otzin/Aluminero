"""
Modelos SQLAlchemy: ProductionOrder, ProductionEvent, ProductionStatusHistory.

- ProductionOrder: orden de producción generada al firmar digitalmente.
- ProductionEvent: eventos/tracking de la orden.
- ProductionStatusHistory: historial de cambios de estado.
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
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class ProductionOrderStatus(str, enum.Enum):
    """Estados de una orden de producción."""

    PENDIENTE = "pendiente"
    EN_PROCESO = "en_proceso"
    TERMINADO = "terminado"
    ENTREGADO = "entregado"
    CANCELADO = "cancelado"


class ProductionOrder(Base):
    """Orden de producción generada a partir de una firma digital."""

    __tablename__ = "production_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    quote_id = Column(
        String(36),
        ForeignKey("quotes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    signature_id = Column(
        String(36),
        ForeignKey("signatures.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    order_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    status = Column(
        SAEnum(ProductionOrderStatus),
        nullable=False,
        default=ProductionOrderStatus.PENDIENTE,
    )
    assigned_to = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    notes = Column(Text, nullable=True)
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
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    project = relationship("Project", backref="production_order")
    quote = relationship("Quote", backref="production_orders")
    signature = relationship("Signature", backref="production_order")
    assignee = relationship("User", backref="production_orders")
    events = relationship(
        "ProductionEvent", back_populates="order", cascade="all, delete-orphan"
    )
    status_history = relationship(
        "ProductionStatusHistory", back_populates="order", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<ProductionOrder {self.order_number} "
            f"project={self.project_id[:8]}... "
            f"[{self.status.value}]>"
        )


class ProductionEvent(Base):
    """Evento de tracking asociado a una orden de producción."""

    __tablename__ = "production_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(
        String(36),
        ForeignKey("production_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type = Column(
        String(50),
        nullable=False,
        index=True,
    )  # creado, asignado, iniciado, pausado, completado, entregado, nota
    description = Column(Text, nullable=False)
    performed_by = Column(
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

    # Relaciones
    order = relationship("ProductionOrder", back_populates="events")
    performer = relationship("User", backref="production_events")

    def __repr__(self) -> str:
        return (
            f"<ProductionEvent {self.id[:8]}... "
            f"order={self.order_id[:8]}... "
            f"type={self.event_type}>"
        )


class ProductionStatusHistory(Base):
    """Historial de cambios de estado de una orden de producción."""

    __tablename__ = "production_status_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(
        String(36),
        ForeignKey("production_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=False)
    changed_by = Column(
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

    # Relaciones
    order = relationship("ProductionOrder", back_populates="status_history")
    changer = relationship("User", backref="production_status_changes")

    def __repr__(self) -> str:
        return (
            f"<ProductionStatusHistory {self.id[:8]}... "
            f"{self.from_status} -> {self.to_status}>"
        )

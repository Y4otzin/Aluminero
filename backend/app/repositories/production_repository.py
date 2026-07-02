"""
Repositorio de producción: operaciones CRUD sobre production_orders.

Patrón: métodos estáticos que reciben session SQLAlchemy.
"""

from typing import Optional, List, Tuple
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app.models.production import (
    ProductionOrder,
    ProductionOrderStatus,
    ProductionEvent,
    ProductionStatusHistory,
)


class ProductionRepository:
    """Acceso a datos de órdenes de producción."""

    # ── ProductionOrder ──────────────────────────────────────────────────

    @staticmethod
    def get_by_id(db: Session, order_id: str) -> Optional[ProductionOrder]:
        """Obtiene una orden por ID con relaciones cargadas."""
        return (
            db.query(ProductionOrder)
            .options(
                joinedload(ProductionOrder.events),
                joinedload(ProductionOrder.status_history),
            )
            .filter(ProductionOrder.id == order_id)
            .first()
        )

    @staticmethod
    def get_by_project(db: Session, project_id: str) -> Optional[ProductionOrder]:
        """Obtiene la orden asociada a un proyecto (única)."""
        return (
            db.query(ProductionOrder)
            .filter(ProductionOrder.project_id == project_id)
            .first()
        )

    @staticmethod
    def get_by_order_number(
        db: Session, order_number: str
    ) -> Optional[ProductionOrder]:
        """Obtiene una orden por su número de orden único."""
        return (
            db.query(ProductionOrder)
            .filter(ProductionOrder.order_number == order_number)
            .first()
        )

    @staticmethod
    def get_last_order_number(db: Session) -> Optional[str]:
        """Obtiene el último order_number registrado para auto-incremento."""
        last = (
            db.query(ProductionOrder.order_number)
            .order_by(ProductionOrder.created_at.desc())
            .first()
        )
        return last[0] if last else None

    @staticmethod
    def count_by_status(db: Session) -> List[Tuple[str, int]]:
        """Cuenta órdenes agrupadas por estado."""
        results = (
            db.query(
                ProductionOrder.status,
                func.count(ProductionOrder.id),
            )
            .group_by(ProductionOrder.status)
            .all()
        )
        return [(r[0].value if hasattr(r[0], "value") else r[0], r[1]) for r in results]

    @staticmethod
    def get_kanban_orders(db: Session) -> List[ProductionOrder]:
        """Obtiene todas las órdenes para el tablero Kanban (excluye canceladas)."""
        return (
            db.query(ProductionOrder)
            .options(
                joinedload(ProductionOrder.events),
                joinedload(ProductionOrder.status_history),
            )
            .order_by(ProductionOrder.created_at.desc())
            .all()
        )

    @staticmethod
    def get_filtered(
        db: Session,
        status: Optional[str] = None,
        assigned_to: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[ProductionOrder], int]:
        """
        Obtiene órdenes con filtros combinables y paginación.

        Retorna (items, total_count).
        """
        query = db.query(ProductionOrder).options(
            joinedload(ProductionOrder.events),
            joinedload(ProductionOrder.status_history),
        )

        if status:
            try:
                status_enum = ProductionOrderStatus(status)
                query = query.filter(ProductionOrder.status == status_enum)
            except ValueError:
                pass

        if assigned_to:
            query = query.filter(ProductionOrder.assigned_to == assigned_to)

        if date_from:
            query = query.filter(ProductionOrder.created_at >= date_from)

        if date_to:
            query = query.filter(ProductionOrder.created_at <= date_to)

        # Total antes de paginar
        total = query.count()

        # Paginación
        items = (
            query.order_by(ProductionOrder.created_at.desc())
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )

        return items, total

    @staticmethod
    def create(db: Session, order_data: dict) -> ProductionOrder:
        """Crea un nuevo registro de orden de producción."""
        order = ProductionOrder(**order_data)
        db.add(order)
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def update(db: Session, order: ProductionOrder) -> ProductionOrder:
        """Actualiza y persiste cambios en una orden."""
        db.commit()
        db.refresh(order)
        return order

    # ── ProductionEvent ──────────────────────────────────────────────────

    @staticmethod
    def add_event(
        db: Session,
        order_id: str,
        event_type: str,
        description: str,
        performed_by: Optional[str] = None,
    ) -> ProductionEvent:
        """Agrega un evento a una orden de producción."""
        event = ProductionEvent(
            order_id=order_id,
            event_type=event_type,
            description=description,
            performed_by=performed_by,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def get_events(
        db: Session, order_id: str
    ) -> List[ProductionEvent]:
        """Obtiene todos los eventos de una orden."""
        return (
            db.query(ProductionEvent)
            .filter(ProductionEvent.order_id == order_id)
            .order_by(ProductionEvent.created_at.asc())
            .all()
        )

    # ── ProductionStatusHistory ──────────────────────────────────────────

    @staticmethod
    def add_status_change(
        db: Session,
        order_id: str,
        from_status: Optional[str],
        to_status: str,
        changed_by: Optional[str] = None,
    ) -> ProductionStatusHistory:
        """Registra un cambio de estado en el historial."""
        change = ProductionStatusHistory(
            order_id=order_id,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
        )
        db.add(change)
        db.commit()
        db.refresh(change)
        return change

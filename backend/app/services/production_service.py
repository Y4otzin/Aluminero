"""
ProductionService: lógica de negocio para órdenes de producción.

- create_order_from_signature: genera orden automática al firmar.
- trigger_production: endpoint manual para activar producción.
- assign_order: asigna orden a un trabajador.
- update_status: cambia estado registrando historial.
- get_kanban: órdenes agrupadas por estado.
- get_order: detalle completo.
- get_orders: lista con filtros.
- add_event: agrega evento/tracking.
- get_production_summary: conteo por estado.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectStatus
from app.models.production import (
    ProductionOrder,
    ProductionOrderStatus,
    ProductionEvent,
    ProductionStatusHistory,
)
from app.models.signature import Signature, SignatureStatus
from app.models.quote import Quote
from app.models.user import User, UserRole
from app.repositories.production_repository import ProductionRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.signature_repository import SignatureRepository
from app.schemas.production import (
    ProductionOrderResponse,
    ProductionEventResponse,
    ProductionStatusHistoryResponse,
    ProductionKanbanResponse,
    ProductionKanbanColumn,
    ProductionOrdersListResponse,
    ProductionSummaryResponse,
    ProductionSummaryItem,
)

logger = logging.getLogger(__name__)


def _generate_order_number(db: Session) -> str:
    """
    Genera un número de orden auto-incremental con formato "ORD-YYYY-NNNN".

    Ejemplo: ORD-2026-0001, ORD-2026-0002, ...
    """
    year = datetime.now(timezone.utc).strftime("%Y")
    last_number = ProductionRepository.get_last_order_number(db)

    if last_number and last_number.startswith(f"ORD-{year}-"):
        try:
            last_seq = int(last_number.split("-")[-1])
            next_seq = last_seq + 1
        except (ValueError, IndexError):
            next_seq = 1
    else:
        next_seq = 1

    return f"ORD-{year}-{next_seq:04d}"


def _order_to_response(order: ProductionOrder) -> ProductionOrderResponse:
    """Convierte un modelo ProductionOrder a su schema Pydantic."""
    events = None
    if order.events:
        events = [
            ProductionEventResponse(
                id=e.id,
                order_id=e.order_id,
                event_type=e.event_type,
                description=e.description,
                performed_by=e.performed_by,
                created_at=e.created_at,
            )
            for e in order.events
        ]

    status_history = None
    if order.status_history:
        status_history = [
            ProductionStatusHistoryResponse(
                id=h.id,
                order_id=h.order_id,
                from_status=h.from_status,
                to_status=h.to_status,
                changed_by=h.changed_by,
                created_at=h.created_at,
            )
            for h in order.status_history
        ]

    return ProductionOrderResponse(
        id=order.id,
        project_id=order.project_id,
        quote_id=order.quote_id,
        signature_id=order.signature_id,
        order_number=order.order_number,
        status=order.status.value if hasattr(order.status, "value") else order.status,
        assigned_to=order.assigned_to,
        notes=order.notes,
        created_at=order.created_at,
        updated_at=order.updated_at,
        completed_at=order.completed_at,
        events=events,
        status_history=status_history,
    )


class ProductionService:
    """Servicio de producción — métodos estáticos con inyección de db."""

    @staticmethod
    def create_order_from_signature(
        db: Session,
        signature_id: str,
    ) -> ProductionOrder:
        """
        Crea una orden de producción automáticamente cuando se firma.

        - Busca la firma y verifica que esté firmada.
        - Busca la quote asociada al proyecto (última versión).
        - Genera order_number auto-incremental.
        - Crea ProductionOrder con status='pendiente'.
        - Actualiza project.status a 'en_produccion'.
        - Registra evento de creación.
        """
        # Validar firma
        signature = SignatureRepository.get_by_id(db, signature_id)
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Firma {signature_id} no encontrada.",
            )

        if signature.status != SignatureStatus.SIGNED:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La firma debe estar en estado 'signed' para generar orden de producción.",
            )

        project = ProjectRepository.get_by_id(db, signature.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto asociado a la firma no encontrado.",
            )

        # Verificar que no exista ya una orden para este proyecto
        existing = ProductionRepository.get_by_project(db, project.id)
        if existing:
            logger.warning(
                f"Ya existe orden {existing.order_number} para proyecto {project.id}"
            )
            return existing

        # Buscar la última quote del proyecto
        quote = (
            db.query(Quote)
            .filter(Quote.project_id == project.id)
            .order_by(Quote.created_at.desc())
            .first()
        )

        # Generar número de orden
        order_number = _generate_order_number(db)

        # Crear la orden
        order_data = {
            "project_id": project.id,
            "quote_id": quote.id if quote else None,
            "signature_id": signature.id,
            "order_number": order_number,
            "status": ProductionOrderStatus.PENDIENTE,
        }
        order = ProductionRepository.create(db, order_data)

        # Actualizar estado del proyecto
        project.status = ProjectStatus.EN_PRODUCCION
        ProjectRepository.update(db, project)

        # Registrar evento de creación
        ProductionRepository.add_event(
            db,
            order.id,
            "creado",
            f"Orden de producción {order_number} generada automáticamente "
            f"tras firma de {signature.signer_name or 'cliente'}.",
        )

        # Registrar historial de estado inicial
        ProductionRepository.add_status_change(
            db,
            order.id,
            from_status=None,
            to_status="pendiente",
        )

        logger.info(
            f"Orden de producción {order_number} creada para proyecto {project.id}"
        )

        return order

    @staticmethod
    def trigger_production(
        db: Session,
        project_id: str,
        user_id: str,
    ) -> ProductionOrder:
        """
        Endpoint manual para activar producción de un proyecto.

        Crea la orden si no existe y el proyecto está aprobado.
        """
        project = ProjectRepository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proyecto {project_id} no encontrado.",
            )

        # Verificar que no exista orden
        existing = ProductionRepository.get_by_project(db, project_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una orden de producción ({existing.order_number}) "
                f"para este proyecto.",
            )

        # Verificar estado del proyecto
        if project.status not in (ProjectStatus.APROBADO, ProjectStatus.EN_PRODUCCION):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"El proyecto debe estar en estado 'aprobado'. Estado actual: "
                f"{project.status.value}",
            )

        # Buscar firma aprobada
        signature = (
            db.query(Signature)
            .filter(
                Signature.project_id == project_id,
                Signature.status == SignatureStatus.SIGNED,
            )
            .order_by(Signature.created_at.desc())
            .first()
        )

        # Buscar última quote
        quote = (
            db.query(Quote)
            .filter(Quote.project_id == project_id)
            .order_by(Quote.created_at.desc())
            .first()
        )

        # Generar número de orden
        order_number = _generate_order_number(db)

        order_data = {
            "project_id": project.id,
            "quote_id": quote.id if quote else None,
            "signature_id": signature.id if signature else None,
            "order_number": order_number,
            "status": ProductionOrderStatus.PENDIENTE,
        }
        order = ProductionRepository.create(db, order_data)

        # Actualizar estado del proyecto
        project.status = ProjectStatus.EN_PRODUCCION
        ProjectRepository.update(db, project)

        # Registrar evento
        ProductionRepository.add_event(
            db,
            order.id,
            "creado",
            f"Orden de producción {order_number} generada manualmente.",
            performed_by=user_id,
        )
        ProductionRepository.add_status_change(
            db,
            order.id,
            from_status=None,
            to_status="pendiente",
            changed_by=user_id,
        )

        logger.info(
            f"Orden {order_number} creada manualmente para proyecto {project.id}"
        )

        return order

    @staticmethod
    def assign_order(
        db: Session,
        order_id: str,
        user_id: str,
        current_user_id: str,
    ) -> ProductionOrder:
        """
        Asigna una orden de producción a un trabajador.

        - Valida que el usuario asignado tenga rol producción.
        - Registra evento de asignación.
        """
        order = ProductionRepository.get_by_id(db, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Orden de producción {order_id} no encontrada.",
            )

        # Validar usuario asignado
        assigned_user = db.query(User).filter(User.id == user_id).first()
        if not assigned_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario {user_id} no encontrado.",
            )

        if assigned_user.role not in (UserRole.PRODUCCION, UserRole.ADMIN):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Solo usuarios con rol 'produccion' o 'admin' pueden ser asignados.",
            )

        old_assignee = order.assigned_to
        order.assigned_to = user_id
        ProductionRepository.update(db, order)

        # Registrar evento
        old_name = f" (anterior: {old_assignee})" if old_assignee else ""
        ProductionRepository.add_event(
            db,
            order.id,
            "asignado",
            f"Orden asignada a {assigned_user.full_name}{old_name}.",
            performed_by=current_user_id,
        )

        # Refrescar con relaciones
        order = ProductionRepository.get_by_id(db, order_id)
        return order

    @staticmethod
    def update_status(
        db: Session,
        order_id: str,
        new_status: str,
        user_id: str,
    ) -> ProductionOrder:
        """
        Cambia el estado de una orden de producción.

        - Valida que el nuevo estado sea válido.
        - Registra historial de cambio.
        - Si el estado es 'terminado' o 'entregado', actualiza completed_at.
        - Si el estado es 'entregado', actualiza project.status a 'entregado'.
        """
        order = ProductionRepository.get_by_id(db, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Orden de producción {order_id} no encontrada.",
            )

        # Validar estado
        try:
            new_status_enum = ProductionOrderStatus(new_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Estado inválido: '{new_status}'. "
                f"Valores válidos: pendiente, en_proceso, terminado, entregado, cancelado",
            )

        old_status = order.status.value if hasattr(order.status, "value") else str(order.status)

        # No permitir cambios desde cancelado
        if order.status == ProductionOrderStatus.CANCELADO:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No se puede cambiar el estado de una orden cancelada.",
            )

        # Actualizar estado
        order.status = new_status_enum

        # Manejar completed_at
        if new_status_enum in (
            ProductionOrderStatus.TERMINADO,
            ProductionOrderStatus.ENTREGADO,
        ):
            if not order.completed_at:
                order.completed_at = datetime.now(timezone.utc)
        elif new_status_enum == ProductionOrderStatus.CANCELADO:
            order.completed_at = None

        ProductionRepository.update(db, order)

        # Registrar historial
        ProductionRepository.add_status_change(
            db,
            order.id,
            from_status=old_status,
            to_status=new_status,
            changed_by=user_id,
        )

        # Registrar evento
        ProductionRepository.add_event(
            db,
            order.id,
            new_status,
            f"Estado cambiado de '{old_status}' a '{new_status}'.",
            performed_by=user_id,
        )

        # Si la orden se entrega, actualizar proyecto
        if new_status_enum == ProductionOrderStatus.ENTREGADO:
            project = ProjectRepository.get_by_id(db, order.project_id)
            if project:
                project.status = ProjectStatus.ENTREGADO
                ProjectRepository.update(db, project)

        # Refrescar con relaciones
        order = ProductionRepository.get_by_id(db, order_id)
        return order

    @staticmethod
    def get_kanban(db: Session) -> ProductionKanbanResponse:
        """
        Devuelve órdenes agrupadas por estado para el tablero Kanban.

        Agrupación: pendiente, en_proceso, terminado, entregado.
        Las órdenes canceladas se listan por separado si existen.
        """
        orders = ProductionRepository.get_kanban_orders(db)

        # Agrupar por estado
        groups = {
            "pendiente": [],
            "en_proceso": [],
            "terminado": [],
            "entregado": [],
            "cancelado": [],
        }

        for order in orders:
            status_key = order.status.value if hasattr(order.status, "value") else str(order.status)
            if status_key in groups:
                groups[status_key].append(order)

        columns = []
        total = 0
        for status_key in ["pendiente", "en_proceso", "terminado", "entregado"]:
            order_list = groups[status_key]
            column_orders = [_order_to_response(o) for o in order_list]
            columns.append(
                ProductionKanbanColumn(
                    status=status_key,
                    orders=column_orders,
                    count=len(column_orders),
                )
            )
            total += len(column_orders)

        return ProductionKanbanResponse(
            columns=columns,
            total=total,
        )

    @staticmethod
    def get_order(db: Session, order_id: str) -> ProductionOrder:
        """Obtiene el detalle completo de una orden."""
        order = ProductionRepository.get_by_id(db, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Orden de producción {order_id} no encontrada.",
            )
        return order

    @staticmethod
    def get_orders(
        db: Session,
        status: Optional[str] = None,
        assigned_to: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        page: int = 1,
        size: int = 20,
    ) -> ProductionOrdersListResponse:
        """Lista órdenes con filtros combinables y paginación."""
        # Convertir fechas de string a datetime si es necesario
        dt_from = None
        dt_to = None
        if date_from:
            try:
                dt_from = datetime.fromisoformat(date_from)
            except ValueError:
                pass
        if date_to:
            try:
                dt_to = datetime.fromisoformat(date_to)
            except ValueError:
                pass

        items, total = ProductionRepository.get_filtered(
            db,
            status=status,
            assigned_to=assigned_to,
            date_from=dt_from,
            date_to=dt_to,
            page=page,
            size=size,
        )

        order_responses = [_order_to_response(o) for o in items]

        return ProductionOrdersListResponse(
            items=order_responses,
            total=total,
            page=page,
            size=size,
        )

    @staticmethod
    def add_event(
        db: Session,
        order_id: str,
        event_type: str,
        description: str,
        user_id: str,
    ) -> ProductionEvent:
        """Agrega un evento/tracking a una orden."""
        order = ProductionRepository.get_by_id(db, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Orden de producción {order_id} no encontrada.",
            )

        return ProductionRepository.add_event(
            db,
            order_id=order_id,
            event_type=event_type,
            description=description,
            performed_by=user_id,
        )

    @staticmethod
    def get_events(
        db: Session, order_id: str
    ) -> List[ProductionEvent]:
        """Obtiene todos los eventos de una orden."""
        order = ProductionRepository.get_by_id(db, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Orden de producción {order_id} no encontrada.",
            )
        return ProductionRepository.get_events(db, order_id)

    @staticmethod
    def get_production_summary(db: Session) -> ProductionSummaryResponse:
        """Devuelve conteo de órdenes por estado."""
        counts = ProductionRepository.count_by_status(db)

        status_order = ["pendiente", "en_proceso", "terminado", "entregado", "cancelado"]
        count_map = dict(counts)

        items = []
        total = 0
        for st in status_order:
            c = count_map.get(st, 0)
            items.append(ProductionSummaryItem(status=st, count=c))
            total += c

        return ProductionSummaryResponse(items=items, total=total)

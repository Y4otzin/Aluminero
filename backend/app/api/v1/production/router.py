"""
Router de Producción: /api/v1/production/* y /api/v1/projects/{id}/trigger-production

Endpoints:
- POST /api/v1/projects/{project_id}/trigger-production  (auth: admin/vendedor)
- GET  /api/v1/production/orders                           (auth: admin/produccion/vendedor)
- GET  /api/v1/production/orders/kanban                    (auth: admin/produccion/vendedor)
- GET  /api/v1/production/orders/{order_id}                (auth: admin/produccion/vendedor)
- PATCH /api/v1/production/orders/{order_id}/assign        (auth: admin/produccion)
- PATCH /api/v1/production/orders/{order_id}/status        (auth: admin/produccion)
- GET  /api/v1/production/summary                          (auth: admin/produccion/vendedor)
- GET  /api/v1/production/events/{order_id}                (auth: admin/produccion/vendedor)
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.production import (
    ProductionOrderResponse,
    ProductionEventResponse,
    ProductionKanbanResponse,
    ProductionAssignRequest,
    ProductionNoteRequest,
    ProductionStatusUpdateRequest,
    ProductionOrdersListResponse,
    ProductionSummaryResponse,
    ProductionTriggerResponse,
)
from app.schemas.auth import MessageResponse
from app.services.production_service import ProductionService
from app.api.dependencies.auth import get_current_user, require_role
from app.models.user import User, UserRole

router = APIRouter(tags=["production"])


# ── Activar producción manual ────────────────────────────────────


@router.post(
    "/api/v1/projects/{project_id}/trigger-production",
    response_model=ProductionTriggerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Activar producción manualmente",
)
async def trigger_production(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.VENDEDOR)
    ),
):
    """
    Activa la producción de un proyecto manualmente.

    Crea una orden de producción si el proyecto está aprobado
    y no tiene una orden existente.

    - Requiere rol admin o vendedor.
    """
    order = ProductionService.trigger_production(
        db,
        project_id=project_id,
        user_id=current_user.id,
    )
    return ProductionTriggerResponse(
        message=f"Orden de producción {order.order_number} creada exitosamente.",
        order=ProductionOrderResponse(
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
        ),
    )


# ── Listar órdenes ───────────────────────────────────────────────


@router.get(
    "/api/v1/production/orders",
    response_model=ProductionOrdersListResponse,
    summary="Listar órdenes de producción",
)
async def list_orders(
    status: Optional[str] = Query(
        None, description="Filtrar por estado (pendiente, en_proceso, terminado, entregado, cancelado)"
    ),
    assigned_to: Optional[str] = Query(
        None, description="Filtrar por usuario asignado"
    ),
    date_from: Optional[str] = Query(
        None, description="Fecha inicio (ISO 8601, ej: 2026-07-01T00:00:00Z)"
    ),
    date_to: Optional[str] = Query(
        None, description="Fecha fin (ISO 8601, ej: 2026-07-31T23:59:59Z)"
    ),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Items por página"),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            UserRole.ADMIN, UserRole.PRODUCCION, UserRole.VENDEDOR
        )
    ),
):
    """
    Lista órdenes de producción con filtros combinables y paginación.

    Filtros:
    - **status**: pendiente, en_proceso, terminado, entregado, cancelado
    - **assigned_to**: ID del usuario asignado
    - **date_from/date_to**: rango de fechas (ISO 8601)
    """
    return ProductionService.get_orders(
        db,
        status=status,
        assigned_to=assigned_to,
        date_from=date_from,
        date_to=date_to,
        page=page,
        size=size,
    )


# ── Kanban ───────────────────────────────────────────────────────


@router.get(
    "/api/v1/production/orders/kanban",
    response_model=ProductionKanbanResponse,
    summary="Obtener tablero Kanban",
)
async def get_kanban(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            UserRole.ADMIN, UserRole.PRODUCCION, UserRole.VENDEDOR
        )
    ),
):
    """
    Devuelve las órdenes agrupadas por estado para el tablero visual Kanban.

    Columnas: pendiente, en_proceso, terminado, entregado.
    """
    return ProductionService.get_kanban(db)


# ── Detalle de orden ─────────────────────────────────────────────


@router.get(
    "/api/v1/production/orders/{order_id}",
    response_model=ProductionOrderResponse,
    summary="Obtener detalle de orden",
)
async def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            UserRole.ADMIN, UserRole.PRODUCCION, UserRole.VENDEDOR
        )
    ),
):
    """
    Devuelve el detalle completo de una orden de producción,
    incluyendo eventos e historial de cambios de estado.
    """
    order = ProductionService.get_order(db, order_id=order_id)
    # Cargar relaciones si no vinieron
    events = ProductionService.get_events(db, order_id)
    order.events = events
    return order


# ── Asignar orden ────────────────────────────────────────────────


@router.patch(
    "/api/v1/production/orders/{order_id}/assign",
    response_model=ProductionOrderResponse,
    summary="Asignar orden a trabajador",
)
async def assign_order(
    order_id: str,
    data: ProductionAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.PRODUCCION)
    ),
):
    """
    Asigna una orden de producción a un trabajador (rol producción o admin).

    - Requiere rol admin o producción.
    - Registra evento de asignación.
    """
    order = ProductionService.assign_order(
        db,
        order_id=order_id,
        user_id=data.user_id,
        current_user_id=current_user.id,
    )
    events = ProductionService.get_events(db, order_id)
    order.events = events
    return order


# ── Cambiar estado ───────────────────────────────────────────────


@router.patch(
    "/api/v1/production/orders/{order_id}/status",
    response_model=ProductionOrderResponse,
    summary="Cambiar estado de orden",
)
async def update_status(
    order_id: str,
    data: ProductionStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ADMIN, UserRole.PRODUCCION)
    ),
):
    """
    Cambia el estado de una orden de producción.

    Estados válidos: pendiente, en_proceso, terminado, entregado, cancelado.
    - Requiere rol admin o producción.
    - Registra historial de cambios.
    - Si se entrega, actualiza el proyecto a 'entregado'.
    """
    order = ProductionService.update_status(
        db,
        order_id=order_id,
        new_status=data.status,
        user_id=current_user.id,
    )
    events = ProductionService.get_events(db, order_id)
    order.events = events
    return order


# ── Resumen ──────────────────────────────────────────────────────


@router.get(
    "/api/v1/production/summary",
    response_model=ProductionSummaryResponse,
    summary="Resumen de producción",
)
async def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            UserRole.ADMIN, UserRole.PRODUCCION, UserRole.VENDEDOR
        )
    ),
):
    """
    Devuelve el conteo de órdenes de producción por estado.

    Incluye: pendiente, en_proceso, terminado, entregado, cancelado.
    """
    return ProductionService.get_production_summary(db)


# ── Eventos de una orden ─────────────────────────────────────────


@router.get(
    "/api/v1/production/events/{order_id}",
    response_model=list[ProductionEventResponse],
    summary="Obtener eventos de una orden",
)
async def get_order_events(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            UserRole.ADMIN, UserRole.PRODUCCION, UserRole.VENDEDOR
        )
    ),
):
    """
    Devuelve todos los eventos/tracking asociados a una orden de producción.

    Eventos: creado, asignado, iniciado, pausado, completado, entregado, nota.
    """
    events = ProductionService.get_events(db, order_id=order_id)
    return [
        ProductionEventResponse(
            id=e.id,
            order_id=e.order_id,
            event_type=e.event_type,
            description=e.description,
            performed_by=e.performed_by,
            created_at=e.created_at,
        )
        for e in events
    ]

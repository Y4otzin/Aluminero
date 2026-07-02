"""
Esquemas Pydantic para el módulo de Producción.

- ProductionOrderResponse: detalle de una orden de producción.
- ProductionEventResponse: evento de tracking.
- ProductionStatusHistoryResponse: cambio de estado.
- ProductionKanbanResponse: órdenes agrupadas por estado (tablero Kanban).
- ProductionAssignRequest: asignación a trabajador.
- ProductionNoteRequest: agregar nota/tracking.
- ProductionStatusUpdateRequest: cambio de estado.
- ProductionOrdersListResponse: lista paginada.
- ProductionSummaryResponse: conteo por estado.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


# ── Entrada ──────────────────────────────────────────────────────────


class ProductionAssignRequest(BaseModel):
    """Asignar una orden de producción a un trabajador."""

    user_id: str = Field(
        ...,
        description="ID del usuario (rol producción) a asignar",
    )

    model_config = {"from_attributes": True}


class ProductionNoteRequest(BaseModel):
    """Agregar una nota/evento a una orden de producción."""

    description: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Descripción del evento o nota",
    )

    model_config = {"from_attributes": True}


class ProductionStatusUpdateRequest(BaseModel):
    """Cambiar el estado de una orden de producción."""

    status: str = Field(
        ...,
        description="Nuevo estado: pendiente, en_proceso, terminado, entregado, cancelado",
    )

    model_config = {"from_attributes": True}


# ── Salida ───────────────────────────────────────────────────────────


class ProductionEventResponse(BaseModel):
    """Ítem individual de evento/tracking de una orden."""

    id: str
    order_id: str
    event_type: str
    description: str
    performed_by: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductionStatusHistoryResponse(BaseModel):
    """Ítem individual de historial de cambio de estado."""

    id: str
    order_id: str
    from_status: Optional[str] = None
    to_status: str
    changed_by: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductionOrderResponse(BaseModel):
    """Respuesta con datos completos de una orden de producción."""

    id: str
    project_id: str
    quote_id: Optional[str] = None
    signature_id: Optional[str] = None
    order_number: str
    status: str
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    events: Optional[List[ProductionEventResponse]] = None
    status_history: Optional[List[ProductionStatusHistoryResponse]] = None

    model_config = {"from_attributes": True}


class ProductionKanbanColumn(BaseModel):
    """Columna del tablero Kanban con órdenes de un estado."""

    status: str
    orders: List[ProductionOrderResponse]
    count: int

    model_config = {"from_attributes": True}


class ProductionKanbanResponse(BaseModel):
    """Tablero Kanban completo — órdenes agrupadas por estado."""

    columns: List[ProductionKanbanColumn]
    total: int

    model_config = {"from_attributes": True}


class ProductionOrdersListResponse(BaseModel):
    """Lista paginada de órdenes de producción."""

    items: List[ProductionOrderResponse]
    total: int
    page: int
    size: int

    model_config = {"from_attributes": True}


class ProductionSummaryItem(BaseModel):
    """Conteo de órdenes en un estado específico."""

    status: str
    count: int

    model_config = {"from_attributes": True}


class ProductionSummaryResponse(BaseModel):
    """Resumen de conteo de órdenes por estado."""

    items: List[ProductionSummaryItem]
    total: int

    model_config = {"from_attributes": True}


class ProductionTriggerResponse(BaseModel):
    """Respuesta al activar producción manualmente."""

    message: str
    order: ProductionOrderResponse

    model_config = {"from_attributes": True}

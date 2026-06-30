"""
Esquemas Pydantic para fotos de evidencia fotográfica.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Entrada ──────────────────────────────────────────────────────────


class PhotoReorderRequest(BaseModel):
    """Solicitud para reordenar las fotos de un proyecto."""

    photo_ids: List[str] = Field(
        ...,
        min_length=1,
        description="Lista de photo IDs en el nuevo orden deseado (todos deben pertenecer al proyecto)",
    )


# ── Salida ───────────────────────────────────────────────────────────


class PhotoResponse(BaseModel):
    """Foto devuelta en respuestas de API."""

    id: str
    project_id: str
    url: str
    original_filename: Optional[str] = None
    order: int
    exif_stripped: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PhotoUploadResponse(BaseModel):
    """Respuesta tras subir una o varias fotos."""

    message: str
    photos: List[PhotoResponse]
    count: int

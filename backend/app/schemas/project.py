"""
Esquemas Pydantic para proyectos.
"""

from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from app.models.project import ProjectStatus


# ── Entrada ──────────────────────────────────────────────────────────


class ProjectCreate(BaseModel):
    """Datos para crear un proyecto nuevo."""

    client_name: str = Field(..., min_length=2, max_length=255)
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = Field(None, max_length=50)
    project_type: str = Field(
        default="ventana",
        min_length=1,
        max_length=100,
        description="Tipo de proyecto: ventana, puerta, cancel, fachada, etc.",
    )
    height_m: float = Field(default=1.0, gt=0, description="Altura en metros")
    width_m: float = Field(default=1.0, gt=0, description="Ancho en metros")
    quantity: int = Field(default=1, ge=1, description="Cantidad de piezas")
    notes: Optional[str] = Field(
        None, max_length=2000, description="Notas y observaciones"
    )

    @field_validator("project_type")
    @classmethod
    def strip_project_type(cls, v: str) -> str:
        return v.strip().lower()


class ProjectUpdate(BaseModel):
    """Datos editables de un proyecto (solo si no está locked)."""

    client_name: Optional[str] = Field(None, min_length=2, max_length=255)
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = Field(None, max_length=50)
    project_type: Optional[str] = Field(None, min_length=1, max_length=100)
    height_m: Optional[float] = Field(None, gt=0)
    width_m: Optional[float] = Field(None, gt=0)
    quantity: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = Field(None, max_length=2000)
    status: Optional[ProjectStatus] = None

    @field_validator("project_type")
    @classmethod
    def strip_project_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip().lower()
        return v


class ProjectFilter(BaseModel):
    """Filtros para listar proyectos."""

    status: Optional[ProjectStatus] = None
    project_type: Optional[str] = None
    search: Optional[str] = Field(
        None, description="Búsqueda en nombre de cliente y notas"
    )
    created_by: Optional[str] = None


# ── Salida ───────────────────────────────────────────────────────────


class ProjectResponse(BaseModel):
    """Proyecto devuelto en respuestas de API."""

    id: str
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    project_type: str
    height_m: float
    width_m: float
    quantity: int
    area_m2: float
    notes: Optional[str] = None
    status: ProjectStatus
    is_locked: bool
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginationInfo(BaseModel):
    """Metadatos de paginación."""

    page: int
    size: int
    total: int
    total_pages: int


class ProjectListResponse(BaseModel):
    """Lista paginada de proyectos."""

    items: List[ProjectResponse]
    pagination: PaginationInfo

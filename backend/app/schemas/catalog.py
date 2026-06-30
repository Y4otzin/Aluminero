"""
Esquemas Pydantic para los catálogos del Sprint 4.

Cada catálogo tiene tres esquemas:
- Create: datos de entrada para crear un nuevo item
- Response: datos de salida (lectura)
- Update: datos editables

Patrón: usar model_config = {"from_attributes": True} para que
SQLAlchemy los hidrate automáticamente.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Esquemas base (campos compartidos) ─────────────────────────────

class CatalogResponseBase(BaseModel):
    """Campos comunes a todos los catálogos (incluye timestamps)."""

    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════
#  AluminumSeries
# ═══════════════════════════════════════════════════════════════════

class AluminumSeriesCreate(BaseModel):
    """Datos para crear una serie de aluminio."""

    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    price_per_m2: float = Field(..., ge=0, description="Precio por metro cuadrado")
    is_active: bool = Field(True, description="Si está activa para cotizaciones")

    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class AluminumSeriesResponse(CatalogResponseBase):
    """Serie de aluminio devuelta en respuestas de API."""

    name: str
    description: Optional[str] = None
    price_per_m2: float
    is_active: bool


class AluminumSeriesUpdate(BaseModel):
    """Datos editables de una serie de aluminio."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    price_per_m2: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None


# ═══════════════════════════════════════════════════════════════════
#  Finish
# ═══════════════════════════════════════════════════════════════════

class FinishCreate(BaseModel):
    """Datos para crear un tipo de acabado."""

    name: str = Field(..., min_length=2, max_length=100)
    price_per_m2: float = Field(..., ge=0, description="Precio adicional por m²")


class FinishResponse(CatalogResponseBase):
    """Tipo de acabado devuelto en respuestas de API."""

    name: str
    price_per_m2: float


class FinishUpdate(BaseModel):
    """Datos editables de un tipo de acabado."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    price_per_m2: Optional[float] = Field(None, ge=0)


# ═══════════════════════════════════════════════════════════════════
#  GlassType
# ═══════════════════════════════════════════════════════════════════

class GlassTypeCreate(BaseModel):
    """Datos para crear un tipo de vidrio."""

    name: str = Field(..., min_length=2, max_length=100)
    price_per_m2: float = Field(..., ge=0, description="Precio por metro cuadrado")


class GlassTypeResponse(CatalogResponseBase):
    """Tipo de vidrio devuelto en respuestas de API."""

    name: str
    price_per_m2: float


class GlassTypeUpdate(BaseModel):
    """Datos editables de un tipo de vidrio."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    price_per_m2: Optional[float] = Field(None, ge=0)


# ═══════════════════════════════════════════════════════════════════
#  Hardware
# ═══════════════════════════════════════════════════════════════════

class HardwareCreate(BaseModel):
    """Datos para crear un herraje/accesorio."""

    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    price_per_unit: float = Field(..., ge=0, description="Precio por unidad")


class HardwareResponse(CatalogResponseBase):
    """Herraje devuelto en respuestas de API."""

    name: str
    description: Optional[str] = None
    price_per_unit: float


class HardwareUpdate(BaseModel):
    """Datos editables de un herraje/accesorio."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    price_per_unit: Optional[float] = Field(None, ge=0)

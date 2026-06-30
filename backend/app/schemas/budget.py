"""Esquemas Pydantic para presupuestos."""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class BudgetCreate(BaseModel):
    aluminum_series_id: str = Field(..., description="ID de la serie de aluminio")
    finish_id: str = Field(..., description="ID del acabado")
    glass_type_id: str = Field(..., description="ID del vidrio")
    hardware_ids: List[str] = Field(default_factory=list, max_length=50)
    height_m: float = Field(..., gt=0, le=100)
    width_m: float = Field(..., gt=0, le=100)
    quantity: int = Field(1, ge=1, le=9999)
    discount_pct: float = Field(0.0, ge=0, le=100)
    notes: Optional[str] = Field(None, max_length=500)


class BudgetResponse(BaseModel):
    id: str
    project_id: str
    version: int
    aluminum_series_id: Optional[str]
    finish_id: Optional[str]
    glass_type_id: Optional[str]
    hardware_ids: List[str] = []
    height_m: float
    width_m: float
    quantity: int
    area_m2: float
    material_cost: float
    labor_cost: float
    subtotal: float
    tax: float
    total: float
    discount_pct: float
    notes: Optional[str]
    is_current: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BudgetVersionSummary(BaseModel):
    version: int
    total: float
    is_current: bool
    created_at: datetime


class BudgetVersionListResponse(BaseModel):
    versions: List[BudgetVersionSummary]


class LaborCostCreate(BaseModel):
    job_type: str = Field(..., min_length=2, max_length=100)
    cost_per_m2: float = Field(..., ge=0)


class LaborCostUpdate(BaseModel):
    cost_per_m2: float = Field(..., ge=0)


class LaborCostResponse(BaseModel):
    id: str
    job_type: str
    cost_per_m2: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

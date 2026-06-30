"""Router para el motor de presupuestos: cálculo, versionado, mano de obra."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.dependencies.auth import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.budget import LaborCost
from app.schemas.budget import (
    BudgetCreate,
    BudgetResponse,
    BudgetVersionSummary,
    BudgetVersionListResponse,
    LaborCostCreate,
    LaborCostUpdate,
    LaborCostResponse,
)
from app.services.budget_service import BudgetService

router = APIRouter(prefix="/api/v1", tags=["budget"])


# ── Presupuestos ──────────────────────────────────────────────

@router.post("/projects/{project_id}/budget", response_model=BudgetResponse)
async def create_budget(
    project_id: str,
    data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea una nueva versión del presupuesto para un proyecto."""
    budget = BudgetService.calculate_and_save(
        db=db,
        project_id=project_id,
        aluminum_series_id=data.aluminum_series_id,
        finish_id=data.finish_id,
        glass_type_id=data.glass_type_id,
        hardware_ids=data.hardware_ids,
        height_m=data.height_m,
        width_m=data.width_m,
        quantity=data.quantity,
        notes=data.notes,
        discount_pct=data.discount_pct,
        force_new=True,
    )
    return budget


@router.get("/projects/{project_id}/budget", response_model=BudgetResponse)
async def get_current_budget(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtiene el presupuesto actual (última versión) de un proyecto."""
    budget = BudgetService.get_current(db, project_id)
    if not budget:
        raise HTTPException(status_code=404, detail="No hay presupuesto para este proyecto")
    return budget


@router.get("/projects/{project_id}/budget/versions", response_model=BudgetVersionListResponse)
async def list_budget_versions(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todas las versiones del presupuesto de un proyecto."""
    versions = BudgetService.get_versions(db, project_id)
    summaries = [
        BudgetVersionSummary(
            version=v.version,
            total=v.total,
            is_current=v.is_current,
            created_at=v.created_at,
        )
        for v in versions
    ]
    return BudgetVersionListResponse(versions=summaries)


@router.get("/projects/{project_id}/budget/{version}", response_model=BudgetResponse)
async def get_budget_version(
    project_id: str,
    version: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtiene una versión específica del presupuesto."""
    budget = BudgetService.get_by_version(db, project_id, version)
    if not budget:
        raise HTTPException(status_code=404, detail="Versión no encontrada")
    return budget


@router.post("/projects/{project_id}/budget/{version}/set-current", response_model=BudgetResponse)
async def set_budget_as_current(
    project_id: str,
    version: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Establece una versión específica como la actual."""
    budget = BudgetService.set_as_current(db, project_id, version)
    return budget


# ── Costos de mano de obra (solo admin puede modificar) ─────

@router.get("/labor-costs", response_model=List[LaborCostResponse])
async def list_labor_costs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos los costos de mano de obra."""
    return db.query(LaborCost).order_by(LaborCost.job_type).all()


@router.get("/labor-costs/{cost_id}", response_model=LaborCostResponse)
async def get_labor_cost(
    cost_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cost = db.query(LaborCost).filter(LaborCost.id == cost_id).first()
    if not cost:
        raise HTTPException(status_code=404, detail="Costo de mano de obra no encontrado")
    return cost


@router.put("/labor-costs/{cost_id}", response_model=LaborCostResponse)
async def update_labor_cost(
    cost_id: str,
    data: LaborCostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    cost = db.query(LaborCost).filter(LaborCost.id == cost_id).first()
    if not cost:
        raise HTTPException(status_code=404, detail="Costo de mano de obra no encontrado")
    cost.cost_per_m2 = data.cost_per_m2
    db.commit()
    db.refresh(cost)
    return cost


@router.get("/projects/{project_id}/budget/{version}/set-current", include_in_schema=False)
async def get_set_current_redirect():
    """Evita que GET intente acceder a esta ruta."""
    raise HTTPException(status_code=405, detail="Usa POST para establecer versión actual")

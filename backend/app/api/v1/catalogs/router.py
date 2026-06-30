"""
Endpoints CRUD de catálogos: /api/v1/catalogs/*

Sub-rutas:
- /aluminum-series  → GET (listar), POST (crear admin), PATCH (editar admin), DELETE (eliminar admin)
- /finishes         → GET, POST (admin), PATCH (admin), DELETE (admin)
- /glass-types      → GET, POST (admin), PATCH (admin), DELETE (admin)
- /hardware         → GET, POST (admin), PATCH (admin), DELETE (admin)

Control de acceso:
- Lectura: cualquier usuario autenticado (vendedor, admin, producción, cliente)
- Escritura/edición/eliminación: solo admin
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.catalog import AluminumSeries, Finish, GlassType, Hardware
from app.models.user import User, UserRole
from app.api.dependencies.auth import get_current_user, require_role
from app.repositories.catalog_repository import CatalogRepository
from app.schemas.catalog import (
    AluminumSeriesCreate,
    AluminumSeriesResponse,
    AluminumSeriesUpdate,
    FinishCreate,
    FinishResponse,
    FinishUpdate,
    GlassTypeCreate,
    GlassTypeResponse,
    GlassTypeUpdate,
    HardwareCreate,
    HardwareResponse,
    HardwareUpdate,
)
from app.schemas.auth import MessageResponse

# ── Router principal ───────────────────────────────────────────────

router = APIRouter(prefix="/api/v1/catalogs", tags=["catalogs"])

# Instanciar repositorios por modelo
aluminum_series_repo = CatalogRepository(AluminumSeries)
finish_repo = CatalogRepository(Finish)
glass_type_repo = CatalogRepository(GlassType)
hardware_repo = CatalogRepository(Hardware)


# ── Helpers ────────────────────────────────────────────────────────

def _get_or_404(repo: CatalogRepository, db: Session, item_id: str, label: str) -> object:
    """Busca un item por ID o lanza 404 con mensaje descriptivo."""
    item = repo.get_by_id(db, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{label} con ID {item_id} no encontrado.",
        )
    return item


# ═══════════════════════════════════════════════════════════════════
#  AluminumSeries
# ═══════════════════════════════════════════════════════════════════

# ── Crear ──────────────────────────────────────────────────────────

@router.post(
    "/aluminum-series",
    response_model=AluminumSeriesResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear serie de aluminio (admin)",
)
async def create_aluminum_series(
    data: AluminumSeriesCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    """Crea una nueva serie de aluminio en el catálogo (solo admin)."""
    # Verificar nombre único
    existing = aluminum_series_repo.get_by_name(db, data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una serie con el nombre '{data.name}'.",
        )
    return aluminum_series_repo.create(db, data.model_dump())


# ── Listar ─────────────────────────────────────────────────────────

@router.get(
    "/aluminum-series",
    response_model=List[AluminumSeriesResponse],
    summary="Listar series de aluminio",
)
async def list_aluminum_series(
    search: Optional[str] = Query(None, description="Buscar por nombre"),
    active_only: bool = Query(False, description="Solo series activas"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Lista todas las series de aluminio disponibles."""
    return aluminum_series_repo.list_all(db, search=search, active_only=active_only)


# ── Leer una ───────────────────────────────────────────────────────

@router.get(
    "/aluminum-series/{series_id}",
    response_model=AluminumSeriesResponse,
    summary="Obtener serie de aluminio por ID",
)
async def get_aluminum_series(
    series_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Devuelve el detalle de una serie de aluminio."""
    return _get_or_404(aluminum_series_repo, db, series_id, "Serie de aluminio")


# ── Editar ─────────────────────────────────────────────────────────

@router.patch(
    "/aluminum-series/{series_id}",
    response_model=AluminumSeriesResponse,
    summary="Editar serie de aluminio (admin)",
)
async def update_aluminum_series(
    series_id: str,
    data: AluminumSeriesUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    """Actualiza los campos de una serie de aluminio (solo admin)."""
    item = _get_or_404(aluminum_series_repo, db, series_id, "Serie de aluminio")

    # Verificar nombre único si se cambió
    if data.name and data.name.lower() != item.name.lower():
        existing = aluminum_series_repo.get_by_name(db, data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una serie con el nombre '{data.name}'.",
            )

    return aluminum_series_repo.update(db, item, data.model_dump(exclude_unset=True))


# ── Eliminar ───────────────────────────────────────────────────────

@router.delete(
    "/aluminum-series/{series_id}",
    response_model=MessageResponse,
    summary="Eliminar serie de aluminio (admin)",
)
async def delete_aluminum_series(
    series_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    """Elimina permanentemente una serie de aluminio (solo admin)."""
    item = _get_or_404(aluminum_series_repo, db, series_id, "Serie de aluminio")
    aluminum_series_repo.delete(db, item)
    return MessageResponse(message=f"Serie de aluminio '{item.name}' eliminada correctamente.")


# ═══════════════════════════════════════════════════════════════════
#  Finishes
# ═══════════════════════════════════════════════════════════════════

@router.post(
    "/finishes",
    response_model=FinishResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear acabado (admin)",
)
async def create_finish(
    data: FinishCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    existing = finish_repo.get_by_name(db, data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un acabado con el nombre '{data.name}'.",
        )
    return finish_repo.create(db, data.model_dump())


@router.get(
    "/finishes",
    response_model=List[FinishResponse],
    summary="Listar acabados",
)
async def list_finishes(
    search: Optional[str] = Query(None, description="Buscar por nombre"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return finish_repo.list_all(db, search=search)


@router.get(
    "/finishes/{finish_id}",
    response_model=FinishResponse,
    summary="Obtener acabado por ID",
)
async def get_finish(
    finish_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return _get_or_404(finish_repo, db, finish_id, "Acabado")


@router.patch(
    "/finishes/{finish_id}",
    response_model=FinishResponse,
    summary="Editar acabado (admin)",
)
async def update_finish(
    finish_id: str,
    data: FinishUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    item = _get_or_404(finish_repo, db, finish_id, "Acabado")
    if data.name and data.name.lower() != item.name.lower():
        existing = finish_repo.get_by_name(db, data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un acabado con el nombre '{data.name}'.",
            )
    return finish_repo.update(db, item, data.model_dump(exclude_unset=True))


@router.delete(
    "/finishes/{finish_id}",
    response_model=MessageResponse,
    summary="Eliminar acabado (admin)",
)
async def delete_finish(
    finish_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    item = _get_or_404(finish_repo, db, finish_id, "Acabado")
    finish_repo.delete(db, item)
    return MessageResponse(message=f"Acabado '{item.name}' eliminado correctamente.")


# ═══════════════════════════════════════════════════════════════════
#  GlassTypes
# ═══════════════════════════════════════════════════════════════════

@router.post(
    "/glass-types",
    response_model=GlassTypeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear tipo de vidrio (admin)",
)
async def create_glass_type(
    data: GlassTypeCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    existing = glass_type_repo.get_by_name(db, data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un tipo de vidrio con el nombre '{data.name}'.",
        )
    return glass_type_repo.create(db, data.model_dump())


@router.get(
    "/glass-types",
    response_model=List[GlassTypeResponse],
    summary="Listar tipos de vidrio",
)
async def list_glass_types(
    search: Optional[str] = Query(None, description="Buscar por nombre"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return glass_type_repo.list_all(db, search=search)


@router.get(
    "/glass-types/{glass_id}",
    response_model=GlassTypeResponse,
    summary="Obtener tipo de vidrio por ID",
)
async def get_glass_type(
    glass_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return _get_or_404(glass_type_repo, db, glass_id, "Tipo de vidrio")


@router.patch(
    "/glass-types/{glass_id}",
    response_model=GlassTypeResponse,
    summary="Editar tipo de vidrio (admin)",
)
async def update_glass_type(
    glass_id: str,
    data: GlassTypeUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    item = _get_or_404(glass_type_repo, db, glass_id, "Tipo de vidrio")
    if data.name and data.name.lower() != item.name.lower():
        existing = glass_type_repo.get_by_name(db, data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un tipo de vidrio con el nombre '{data.name}'.",
            )
    return glass_type_repo.update(db, item, data.model_dump(exclude_unset=True))


@router.delete(
    "/glass-types/{glass_id}",
    response_model=MessageResponse,
    summary="Eliminar tipo de vidrio (admin)",
)
async def delete_glass_type(
    glass_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    item = _get_or_404(glass_type_repo, db, glass_id, "Tipo de vidrio")
    glass_type_repo.delete(db, item)
    return MessageResponse(message=f"Tipo de vidrio '{item.name}' eliminado correctamente.")


# ═══════════════════════════════════════════════════════════════════
#  Hardware
# ═══════════════════════════════════════════════════════════════════

@router.post(
    "/hardware",
    response_model=HardwareResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear herraje (admin)",
)
async def create_hardware(
    data: HardwareCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    existing = hardware_repo.get_by_name(db, data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un herraje con el nombre '{data.name}'.",
        )
    return hardware_repo.create(db, data.model_dump())


@router.get(
    "/hardware",
    response_model=List[HardwareResponse],
    summary="Listar herrajes",
)
async def list_hardware(
    search: Optional[str] = Query(None, description="Buscar por nombre"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return hardware_repo.list_all(db, search=search)


@router.get(
    "/hardware/{hardware_id}",
    response_model=HardwareResponse,
    summary="Obtener herraje por ID",
)
async def get_hardware(
    hardware_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return _get_or_404(hardware_repo, db, hardware_id, "Herraje")


@router.patch(
    "/hardware/{hardware_id}",
    response_model=HardwareResponse,
    summary="Editar herraje (admin)",
)
async def update_hardware(
    hardware_id: str,
    data: HardwareUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    item = _get_or_404(hardware_repo, db, hardware_id, "Herraje")
    if data.name and data.name.lower() != item.name.lower():
        existing = hardware_repo.get_by_name(db, data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un herraje con el nombre '{data.name}'.",
            )
    return hardware_repo.update(db, item, data.model_dump(exclude_unset=True))


@router.delete(
    "/hardware/{hardware_id}",
    response_model=MessageResponse,
    summary="Eliminar herraje (admin)",
)
async def delete_hardware(
    hardware_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    item = _get_or_404(hardware_repo, db, hardware_id, "Herraje")
    hardware_repo.delete(db, item)
    return MessageResponse(message=f"Herraje '{item.name}' eliminado correctamente.")

"""
Endpoints CRUD de proyectos: /api/v1/projects/*

Requiere autenticación (Bearer JWT) para todas las operaciones.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectFilter,
)
from app.schemas.auth import MessageResponse
from app.services.project_service import ProjectService
from app.api.dependencies.auth import get_current_user
from app.models.user import User
from app.models.project import ProjectStatus

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.post(
    "/",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear proyecto",
)
async def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Crea un nuevo proyecto de herrería.

    - Calcula el área automáticamente (alto × ancho × cantidad).
    - El proyecto inicia en estado 'borrador'.
    - Asigna al usuario autenticado como creador.
    """
    project = ProjectService.create(db, data, created_by=current_user.id)
    return project


@router.get(
    "/",
    response_model=ProjectListResponse,
    summary="Listar proyectos",
)
async def list_projects(
    status_filter: Optional[ProjectStatus] = Query(
        None, alias="status", description="Filtrar por estado"
    ),
    project_type: Optional[str] = Query(
        None, description="Filtrar por tipo de proyecto"
    ),
    search: Optional[str] = Query(
        None, description="Buscar en nombre, email y notas"
    ),
    created_by: Optional[str] = Query(
        None, description="Filtrar por usuario creador"
    ),
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Items por página"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lista proyectos con filtros combinables y paginación.

    Filtros disponibles:
    - **status**: borrador, en_cotizacion, pendiente_firma, aprobado, rechazado, etc.
    - **project_type**: ventana, puerta, cancel, fachada, etc.
    - **search**: búsqueda por nombre, email o notas
    - **created_by**: filtrar por usuario creador
    """
    filters = ProjectFilter(
        status=status_filter,
        project_type=project_type,
        search=search,
        created_by=created_by,
    )
    return ProjectService.list_projects(db, filters, page=page, size=size)


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Obtener proyecto por ID",
)
async def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve el detalle completo de un proyecto.
    """
    return ProjectService.get_by_id(db, project_id)


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Editar proyecto",
)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Actualiza los campos de un proyecto.

    - Recalcula el área automáticamente si cambian dimensiones.
    - No permite editar proyectos bloqueados (is_locked=True).
    """
    return ProjectService.update(db, project_id, data)


@router.delete(
    "/{project_id}",
    response_model=MessageResponse,
    summary="Eliminar proyecto",
)
async def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Elimina permanentemente un proyecto en estado 'borrador'.

    Solo se pueden eliminar proyectos que no hayan avanzado
    más allá del estado inicial.
    """
    ProjectService.delete(db, project_id)
    return MessageResponse(
        message=f"Proyecto {project_id} eliminado correctamente."
    )

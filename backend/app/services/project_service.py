"""
ProjectService: lógica de negocio para proyectos de herrería.

- Cálculo automático de área: area_m2 = height_m * width_m * quantity
- Bloqueo: al firmar is_locked=True, no se puede editar después
- Soft-delete solo para borradores
"""

from typing import Optional, Tuple, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectStatus
from app.models.user import User
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    PaginationInfo,
    ProjectFilter,
)


class ProjectService:
    """Servicio de proyectos — métodos estáticos con inyección de db."""

    # ── Crear ────────────────────────────────────────────────────────

    @staticmethod
    def create(db: Session, data: ProjectCreate, created_by: str) -> Project:
        """Crea un proyecto nuevo con área calculada automáticamente."""
        project_dict = data.model_dump(exclude_unset=True)
        project_dict["created_by"] = created_by
        project_dict["status"] = ProjectStatus.BORRADOR
        # El área se calcula en el repositorio vía calculate_area()
        project = ProjectRepository.create(db, project_dict)
        return project

    # ── Leer ─────────────────────────────────────────────────────────

    @staticmethod
    def get_by_id(db: Session, project_id: str) -> Project:
        """Obtiene un proyecto por ID o lanza 404."""
        project = ProjectRepository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proyecto {project_id} no encontrado.",
            )
        return project

    @staticmethod
    def list_projects(
        db: Session,
        filters: ProjectFilter,
        page: int = 1,
        size: int = 20,
    ) -> ProjectListResponse:
        """
        Lista proyectos con filtros y paginación.

        Args:
            db: Sesión de base de datos.
            filters: Filtros combinables (status, type, search, created_by).
            page: Número de página (1-indexado).
            size: Items por página.

        Returns:
            ProjectListResponse con items y metadatos de paginación.
        """
        size = max(1, min(size, 100))  # Limitar entre 1 y 100
        page = max(1, page)

        projects, total = ProjectRepository.list_filtered(
            db,
            status=filters.status,
            project_type=filters.project_type,
            search=filters.search,
            created_by=filters.created_by,
            page=page,
            size=size,
        )

        total_pages = max(1, (total + size - 1) // size)

        return ProjectListResponse(
            items=[ProjectResponse.model_validate(p) for p in projects],
            pagination=PaginationInfo(
                page=page,
                size=size,
                total=total,
                total_pages=total_pages,
            ),
        )

    # ── Editar ───────────────────────────────────────────────────────

    @staticmethod
    def update(
        db: Session,
        project_id: str,
        data: ProjectUpdate,
    ) -> Project:
        """
        Actualiza un proyecto (solo si no está bloqueado).

        - Recalcula el área si cambian dimensiones.
        - No permite editar proyectos con is_locked=True.
        """
        project = ProjectRepository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proyecto {project_id} no encontrado.",
            )

        if project.is_locked:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="El proyecto está bloqueado (ya fue firmado). No se puede editar.",
            )

        # Aplicar campos enviados
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)

        # Recalcular área si cambiaron dimensiones
        if any(k in update_data for k in ("height_m", "width_m", "quantity")):
            project.calculate_area()

        return ProjectRepository.update(db, project)

    # ── Eliminar / Cancelar ─────────────────────────────────────────

    @staticmethod
    def delete(db: Session, project_id: str) -> None:
        """
        Elimina un proyecto (solo si está en estado borrador).

        - Borradores: se eliminan permanentemente.
        - Otros estados: no se permite eliminar.
        """
        project = ProjectRepository.get_by_id(db, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proyecto {project_id} no encontrado.",
            )

        if project.status != ProjectStatus.BORRADOR:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Solo se pueden eliminar proyectos en estado 'borrador'.",
            )

        ProjectRepository.soft_delete(db, project)

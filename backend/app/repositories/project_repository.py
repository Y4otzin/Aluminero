"""
Repositorio de proyectos: operaciones CRUD sobre la tabla `projects`.

Patrón: métodos estáticos que reciben session SQLAlchemy.
"""

from typing import Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.project import Project, ProjectStatus


class ProjectRepository:
    """Acceso a datos de proyectos."""

    @staticmethod
    def get_by_id(db: Session, project_id: str) -> Optional[Project]:
        return db.query(Project).filter(Project.id == project_id).first()

    @staticmethod
    def create(db: Session, project_data: dict) -> Project:
        project = Project(**project_data)
        project.calculate_area()
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def update(db: Session, project: Project) -> Project:
        project.calculate_area()
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def soft_delete(db: Session, project: Project) -> None:
        """Elimina permanentemente el proyecto (solo borradores)."""
        db.delete(project)
        db.commit()

    @staticmethod
    def list_filtered(
        db: Session,
        status: Optional[ProjectStatus] = None,
        project_type: Optional[str] = None,
        search: Optional[str] = None,
        created_by: Optional[str] = None,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[list[Project], int]:
        """
        Lista proyectos con filtros opcionales y paginación.

        Returns:
            (lista_de_proyectos, total)
        """
        query = db.query(Project)

        # Filtros
        filters = []
        if status is not None:
            filters.append(Project.status == status)
        if project_type is not None:
            filters.append(Project.project_type == project_type.strip().lower())
        if created_by is not None:
            filters.append(Project.created_by == created_by)
        if search is not None:
            search_term = f"%{search.strip()}%"
            filters.append(
                or_(
                    Project.client_name.ilike(search_term),
                    Project.notes.ilike(search_term),
                    Project.client_email.ilike(search_term),
                )
            )

        if filters:
            query = query.filter(and_(*filters))

        # Total antes de paginación
        total = query.count()

        # Paginación
        offset = (page - 1) * size
        projects = query.order_by(Project.created_at.desc()).offset(offset).limit(size).all()

        return projects, total

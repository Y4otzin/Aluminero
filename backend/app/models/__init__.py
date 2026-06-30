"""
Modelos de la aplicación — importalos desde Alembic env.py con:
    from app.models import Base, User, Session
"""
from app.models.user import Base, User, Session, UserRole
from app.models.project import Project, WorkType, ProjectStatus
from app.models.photo import Photo

__all__ = ["Base", "User", "Session", "UserRole", "Project", "WorkType", "ProjectStatus", "Photo"]

"""
Modelos de la aplicación — importalos desde Alembic env.py con:
    from app.models import Base, User, Session
"""
from app.models.user import Base, User, Session, UserRole
from app.models.project import Project, WorkType, ProjectStatus
from app.models.photo import Photo
from app.models.catalog import AluminumSeries, Finish, GlassType, Hardware
from app.models.budget import Budget, LaborCost, budget_hardware

__all__ = [
    "Base",
    "User",
    "Session",
    "UserRole",
    "Project",
    "WorkType",
    "ProjectStatus",
    "Photo",
    "AluminumSeries",
    "Finish",
    "GlassType",
    "Hardware",
    "Budget",
    "LaborCost",
    "budget_hardware",
]

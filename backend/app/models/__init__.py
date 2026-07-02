"""
Modelos de la aplicación — importalos desde Alembic env.py con:
    from app.models import Base, User, Session
"""
from app.models.user import Base, User, Session, UserRole
from app.models.project import Project, WorkType, ProjectStatus
from app.models.photo import Photo
from app.models.catalog import AluminumSeries, Finish, GlassType, Hardware
from app.models.budget import Budget, LaborCost, budget_hardware
from app.models.signature import Signature, SignatureEvidence, SignatureStatus
from app.models.quote import Quote, QuoteHistory, QuoteStatus
from app.models.production import (
    ProductionOrder,
    ProductionOrderStatus,
    ProductionEvent,
    ProductionStatusHistory,
)

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
    "Signature",
    "SignatureEvidence",
    "SignatureStatus",
    "Quote",
    "QuoteHistory",
    "QuoteStatus",
    "ProductionOrder",
    "ProductionOrderStatus",
    "ProductionEvent",
    "ProductionStatusHistory",
]

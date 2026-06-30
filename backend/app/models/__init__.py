"""
Modelos de la aplicación — importalos desde Alembic env.py con:
    from app.models import Base, User, Session
"""
from app.models.user import Base, User, Session, UserRole

__all__ = ["Base", "User", "Session", "UserRole"]

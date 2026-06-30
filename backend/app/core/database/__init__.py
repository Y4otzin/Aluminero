"""
Motor de base de datos SQLAlchemy 2.0 — PostgreSQL + Alembic

Conexión síncrona con pool gestionado desde settings.DATABASE_URL.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config.settings import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=settings.APP_ENV == "development",
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependencia FastAPI que inyecta una sesión de base de datos."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

"""
Alembic environment configuration.

Importa los metadatos de SQLAlchemy desde app.models para
que --autogenerate detecte los modelos.
"""

from logging.config import fileConfig
import os
import sys

# Agregar el directorio raíz al path para que los imports funcionen
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from alembic import context
from sqlalchemy import engine_from_config, pool

# ── Cargar los modelos de SQLAlchemy ─────────────────────────────────
# Esto es necesario para que Alembic detecte las tablas en autogenerate
from app.core.database import Base
from app.models import *  # noqa: F401, F403 — necesario para autogenerate

# ── Configuración ───────────────────────────────────────────────────
config = context.config

# Sobrescribir sqlalchemy.url desde variable de entorno
from app.core.config.settings import settings

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Logging desde alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Ejecuta migraciones en modo 'offline' (genera SQL sin conectarse)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Ejecuta migraciones conectándose a la base de datos."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

"""add_catalog_tables

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f6a7
Create Date: 2026-06-29 23:45:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ── Seed data ──────────────────────────────────────────────────────

ALUMINUM_SERIES_SEED = [
    {"name": "Línea 25", "description": "Serie económica para ventanas corredizas y fijas residenciales.", "price_per_m2": 450.00},
    {"name": "Línea Europea", "description": "Sistema de inclinación y giro (tilt & turn) con rotura de puente térmico.", "price_per_m2": 850.00},
    {"name": "Línea 35", "description": "Serie media para canceles, puertas abatibles y ventanas de alta prestación.", "price_per_m2": 620.00},
    {"name": "Línea 45", "description": "Serie pesada para fachadas, muro cortina y grandes claros estructurales.", "price_per_m2": 1100.00},
    {"name": "Línea Minimalista", "description": "Perfiles de marco reducido para ventanas panorámicas con perfil visto mínimo.", "price_per_m2": 980.00},
]

FINISH_SEED = [
    {"name": "natural", "price_per_m2": 0.00},
    {"name": "anodizado", "price_per_m2": 180.00},
    {"name": "pintado", "price_per_m2": 250.00},
    {"name": "madera", "price_per_m2": 350.00},
]

GLASS_TYPE_SEED = [
    {"name": "claro", "price_per_m2": 120.00},
    {"name": "templado", "price_per_m2": 280.00},
    {"name": "laminado", "price_per_m2": 420.00},
    {"name": "doble", "price_per_m2": 550.00},
    {"name": "reflectivo", "price_per_m2": 380.00},
    {"name": "bajo_emisivo", "price_per_m2": 650.00},
]

HARDWARE_SEED = [
    {"name": "manija push", "description": "Manija de empuje con cerradura integrada para ventanas corredizas.", "price_per_unit": 85.00},
    {"name": "manija cremona", "description": "Cremona multipunto para ventanas abatibles y puertas.", "price_per_unit": 320.00},
    {"name": "bisagra aluminio", "description": "Bisagra de aluminio reforzado para puertas abatibles (par).", "price_per_unit": 65.00},
    {"name": "cerradura embutir", "description": "Cerradura de embutir multipunto para puertas de aluminio.", "price_per_unit": 450.00},
    {"name": "brazo proyectante", "description": "Brazo lateral para ventana proyectante con ajuste de apertura.", "price_per_unit": 220.00},
    {"name": "riel superior", "description": "Riel de aluminio para puertas corredizas (por metro lineal).", "price_per_unit": 140.00},
    {"name": "rueda nylon", "description": "Rueda de nylon con balero para carros corredizos (par).", "price_per_unit": 95.00},
    {"name": "felpa sellado", "description": "Felpa autoadherible para sellado de ventanas corredizas (metro).", "price_per_unit": 12.00},
]


def upgrade() -> None:
    # ── aluminum_series ────────────────────────────────────────────
    op.create_table(
        'aluminum_series',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price_per_m2', sa.Float(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_aluminum_series_name', 'aluminum_series', ['name'], unique=True)

    for item in ALUMINUM_SERIES_SEED:
        op.execute(
            f"""
            INSERT INTO aluminum_series (id, name, description, price_per_m2, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid()::text,
                '{item["name"].replace("'", "''")}',
                '{item["description"].replace("'", "''")}',
                {item["price_per_m2"]},
                true,
                now(),
                now()
            )
            """
        )

    # ── finishes ───────────────────────────────────────────────────
    op.create_table(
        'finishes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('price_per_m2', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_finishes_name', 'finishes', ['name'], unique=True)

    for item in FINISH_SEED:
        op.execute(
            f"""
            INSERT INTO finishes (id, name, price_per_m2, created_at, updated_at)
            VALUES (
                gen_random_uuid()::text,
                '{item["name"].replace("'", "''")}',
                {item["price_per_m2"]},
                now(),
                now()
            )
            """
        )

    # ── glass_types ────────────────────────────────────────────────
    op.create_table(
        'glass_types',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('price_per_m2', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_glass_types_name', 'glass_types', ['name'], unique=True)

    for item in GLASS_TYPE_SEED:
        op.execute(
            f"""
            INSERT INTO glass_types (id, name, price_per_m2, created_at, updated_at)
            VALUES (
                gen_random_uuid()::text,
                '{item["name"].replace("'", "''")}',
                {item["price_per_m2"]},
                now(),
                now()
            )
            """
        )

    # ── hardware_items ─────────────────────────────────────────────
    op.create_table(
        'hardware_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price_per_unit', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_hardware_items_name', 'hardware_items', ['name'], unique=True)

    for item in HARDWARE_SEED:
        op.execute(
            f"""
            INSERT INTO hardware_items (id, name, description, price_per_unit, created_at, updated_at)
            VALUES (
                gen_random_uuid()::text,
                '{item["name"].replace("'", "''")}',
                '{item["description"].replace("'", "''")}',
                {item["price_per_unit"]},
                now(),
                now()
            )
            """
        )


def downgrade() -> None:
    op.drop_index('ix_hardware_items_name', table_name='hardware_items')
    op.drop_table('hardware_items')
    op.drop_index('ix_glass_types_name', table_name='glass_types')
    op.drop_table('glass_types')
    op.drop_index('ix_finishes_name', table_name='finishes')
    op.drop_table('finishes')
    op.drop_index('ix_aluminum_series_name', table_name='aluminum_series')
    op.drop_table('aluminum_series')

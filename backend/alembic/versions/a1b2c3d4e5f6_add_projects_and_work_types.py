"""add_projects_and_work_types

Revision ID: a1b2c3d4e5f6
Revises: d0921ad7ae0a
Create Date: 2026-06-29 22:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'd0921ad7ae0a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ── Seed data: catálogo de tipos de trabajo ─────────────────────────

WORK_TYPE_SEED = [
    {"name": "ventana corrediza", "description": "Ventana de aluminio con sistema corredizo (2 o más hojas deslizantes)."},
    {"name": "ventana fija", "description": "Ventana fija sin apertura, solo marco y vidrio."},
    {"name": "ventana abatible", "description": "Ventana con apertura batiente (abisagrada lateral o superior)."},
    {"name": "ventana proyectante", "description": "Ventana que proyecta hacia afuera mediante brazos laterales."},
    {"name": "puerta corrediza", "description": "Puerta de aluminio con sistema corredizo, ideal para terrazas y patios."},
    {"name": "puerta abatible", "description": "Puerta de aluminio con apertura batiente estándar."},
    {"name": "puerta plegadiza", "description": "Puerta de múltiples hojas que se pliegan lateralmente (acordeón)."},
    {"name": "cancel de baño", "description": "Cancel de aluminio para ducha con vidrio templado."},
    {"name": "cancel de cocina", "description": "División de aluminio y vidrio para cocina integral."},
    {"name": "fachada", "description": "Fachada de aluminio tipo muro cortina o panel composite."},
    {"name": "barandal", "description": "Barandal de aluminio para escaleras, balcones o terrazas."},
    {"name": "protección", "description": "Protecciones de aluminio para ventanas y puertas (reja decorativa)."},
    {"name": "mosquitero", "description": "Marco con malla mosquitera de aluminio."},
    {"name": "domo", "description": "Domo o tragaluz de aluminio con vidrio."},
    {"name": "pergolado", "description": "Estructura de pérgola en aluminio para exteriores."},
    {"name": "celosía", "description": "Celosía decorativa de aluminio para fachadas o divisiones."},
    {"name": "closet", "description": "Puertas y estructura de closet en aluminio."},
    {"name": "ventana tipo europea", "description": "Ventana con sistema europeo de inclinación y giro (tilt & turn)."},
]


def upgrade() -> None:
    # ── Tabla work_types ─────────────────────────────────────────
    op.create_table(
        'work_types',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_work_types_name'), 'work_types', ['name'], unique=True)

    # ── Tabla projects ───────────────────────────────────────────
    op.create_table(
        'projects',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('client_name', sa.String(length=255), nullable=False),
        sa.Column('client_email', sa.String(length=255), nullable=True),
        sa.Column('client_phone', sa.String(length=50), nullable=True),
        sa.Column('project_type', sa.String(length=100), nullable=False),
        sa.Column('height_m', sa.Float(), nullable=False),
        sa.Column('width_m', sa.Float(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('area_m2', sa.Float(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column(
            'status',
            sa.Enum(
                'BORRADOR', 'EN_COTIZACION', 'PENDIENTE_FIRMA', 'APROBADO',
                'RECHAZADO', 'EN_PRODUCCION', 'TERMINADO', 'ENTREGADO',
                name='projectstatus',
            ),
            nullable=False,
        ),
        sa.Column('is_locked', sa.Boolean(), nullable=False),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(
            ['created_by'], ['users.id'],
            ondelete='SET NULL',
        ),
    )
    op.create_index(op.f('ix_projects_created_by'), 'projects', ['created_by'], unique=False)

    # ── Insertar seed data de work_types ─────────────────────────
    now = sa.text('now()')
    for wt in WORK_TYPE_SEED:
        op.execute(
            f"""
            INSERT INTO work_types (id, name, description, is_active, created_at)
            VALUES (
                gen_random_uuid()::text,
                '{wt["name"].replace("'", "''")}',
                '{wt["description"].replace("'", "''")}',
                true,
                {now}
            )
            """
        )


def downgrade() -> None:
    op.drop_index(op.f('ix_projects_created_by'), table_name='projects')
    op.drop_table('projects')
    op.execute("DROP TYPE IF EXISTS projectstatus")
    op.drop_index(op.f('ix_work_types_name'), table_name='work_types')
    op.drop_table('work_types')

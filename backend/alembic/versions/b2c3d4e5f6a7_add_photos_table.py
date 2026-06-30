"""add_photos_table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-29 23:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Tabla photos ────────────────────────────────────────────
    op.create_table(
        'photos',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('url', sa.Text(), nullable=False,
                  comment='URL en Supabase Storage o filesystem local'),
        sa.Column('original_filename', sa.String(length=500), nullable=True,
                  comment='Nombre original del archivo subido'),
        sa.Column('order', sa.Integer(), nullable=False, server_default=sa.text('0'),
                  comment='Posición en la galería'),
        sa.Column('exif_stripped', sa.Boolean(), nullable=False,
                  server_default=sa.text('true'),
                  comment='True si se limpiaron metadatos EXIF/GPS'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(
            ['project_id'], ['projects.id'],
            ondelete='CASCADE',
        ),
    )
    op.create_index(op.f('ix_photos_project_id'), 'photos', ['project_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_photos_project_id'), table_name='photos')
    op.drop_table('photos')

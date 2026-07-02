"""add_production_tables

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
Create Date: 2026-07-02 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### ProductionOrderStatus enum ###
    production_order_status = sa.Enum(
        "pendiente", "en_proceso", "terminado", "entregado", "cancelado",
        name="productionorderstatus",
    )

    # ### production_orders ###
    op.create_table(
        "production_orders",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("project_id", sa.String(36), nullable=False),
        sa.Column("quote_id", sa.String(36), nullable=True),
        sa.Column("signature_id", sa.String(36), nullable=True),
        sa.Column("order_number", sa.String(50), nullable=False),
        sa.Column(
            "status",
            production_order_status,
            nullable=False,
            server_default="pendiente",
        ),
        sa.Column("assigned_to", sa.String(36), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["quote_id"],
            ["quotes.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["signature_id"],
            ["signatures.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_to"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_number"),
        sa.UniqueConstraint("project_id"),
    )
    op.create_index(
        op.f("ix_production_orders_project_id"),
        "production_orders",
        ["project_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_production_orders_order_number"),
        "production_orders",
        ["order_number"],
        unique=True,
    )
    op.create_index(
        op.f("ix_production_orders_assigned_to"),
        "production_orders",
        ["assigned_to"],
    )
    op.create_index(
        op.f("ix_production_orders_quote_id"),
        "production_orders",
        ["quote_id"],
    )
    op.create_index(
        op.f("ix_production_orders_signature_id"),
        "production_orders",
        ["signature_id"],
    )

    # ### production_events ###
    op.create_table(
        "production_events",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("order_id", sa.String(36), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("performed_by", sa.String(36), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["production_orders.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["performed_by"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_production_events_order_id"),
        "production_events",
        ["order_id"],
    )
    op.create_index(
        op.f("ix_production_events_event_type"),
        "production_events",
        ["event_type"],
    )
    op.create_index(
        op.f("ix_production_events_performed_by"),
        "production_events",
        ["performed_by"],
    )

    # ### production_status_history ###
    op.create_table(
        "production_status_history",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("order_id", sa.String(36), nullable=False),
        sa.Column("from_status", sa.String(50), nullable=True),
        sa.Column("to_status", sa.String(50), nullable=False),
        sa.Column("changed_by", sa.String(36), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["production_orders.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["changed_by"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_production_status_history_order_id"),
        "production_status_history",
        ["order_id"],
    )
    op.create_index(
        op.f("ix_production_status_history_changed_by"),
        "production_status_history",
        ["changed_by"],
    )


def downgrade() -> None:
    op.drop_table("production_status_history")
    op.drop_table("production_events")
    op.drop_table("production_orders")
    sa.Enum(name="productionorderstatus").drop(op.get_bind())

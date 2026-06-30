"""add_budget_and_labor_cost_tables

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-06-29 22:15:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tabla intermedia budget ↔ hardware
    op.create_table(
        "budget_hardware",
        sa.Column("budget_id", sa.String(36), nullable=False),
        sa.Column("hardware_id", sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(["budget_id"], ["budgets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["hardware_id"], ["hardware.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("budget_id", "hardware_id"),
    )

    # Tabla de presupuestos
    op.create_table(
        "budgets",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("project_id", sa.String(36), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("aluminum_series_id", sa.String(36), nullable=True),
        sa.Column("finish_id", sa.String(36), nullable=True),
        sa.Column("glass_type_id", sa.String(36), nullable=True),
        sa.Column("height_m", sa.Float(), nullable=False),
        sa.Column("width_m", sa.Float(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("area_m2", sa.Float(), nullable=False),
        sa.Column("material_cost", sa.Float(), nullable=False, server_default="0"),
        sa.Column("labor_cost", sa.Float(), nullable=False, server_default="0"),
        sa.Column("subtotal", sa.Float(), nullable=False, server_default="0"),
        sa.Column("tax", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total", sa.Float(), nullable=False, server_default="0"),
        sa.Column("discount_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["aluminum_series_id"], ["aluminum_series.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["finish_id"], ["finishes.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["glass_type_id"], ["glass_types.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_budgets_project_id"), "budgets", ["project_id"])

    # Tabla de costos de mano de obra
    op.create_table(
        "labor_costs",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("job_type", sa.String(100), nullable=False),
        sa.Column("cost_per_m2", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_type"),
    )
    op.create_index(op.f("ix_labor_costs_job_type"), "labor_costs", ["job_type"])

    # Seed data para LaborCost
    op.execute("""
        INSERT INTO labor_costs (id, job_type, cost_per_m2) VALUES
        (gen_random_uuid()::text, 'ventana', 350),
        (gen_random_uuid()::text, 'puerta', 450),
        (gen_random_uuid()::text, 'cancel', 300),
        (gen_random_uuid()::text, 'fachada', 500),
        (gen_random_uuid()::text, 'barandal', 400),
        (gen_random_uuid()::text, 'domo', 380)
    """)


def downgrade() -> None:
    op.drop_index(op.f("ix_labor_costs_job_type"), table_name="labor_costs")
    op.drop_table("labor_costs")
    op.drop_index(op.f("ix_budgets_project_id"), table_name="budgets")
    op.drop_table("budgets")
    op.drop_table("budget_hardware")

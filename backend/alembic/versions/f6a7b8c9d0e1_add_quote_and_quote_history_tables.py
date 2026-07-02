"""add_quote_and_quote_history_tables

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-02 15:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quotes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column(
            "project_id",
            sa.String(length=36),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("budget_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("pdf_url", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("draft", "sent", "signed", name="quotestatus"),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "creator_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quotes_project_id", "quotes", ["project_id"])
    op.create_index("ix_quotes_creator_id", "quotes", ["creator_id"])

    op.create_table(
        "quote_history",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column(
            "quote_id",
            sa.String(length=36),
            sa.ForeignKey("quotes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("action", sa.String(length=50), nullable=False, index=True),
        sa.Column(
            "performed_by",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quote_history_quote_id", "quote_history", ["quote_id"])
    op.create_index("ix_quote_history_action", "quote_history", ["action"])
    op.create_index(
        "ix_quote_history_performed_by", "quote_history", ["performed_by"]
    )


def downgrade() -> None:
    op.drop_table("quote_history")
    op.drop_table("quotes")
    op.execute("DROP TYPE IF EXISTS quotestatus")

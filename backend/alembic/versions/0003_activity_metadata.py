"""activity log metadata for workflow observability

Revision ID: 0003_activity_metadata
Revises: 0002_session_routing_trace
Create Date: 2026-06-01

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_activity_metadata"
down_revision: Union[str, None] = "0002_session_routing_trace"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "activity_logs",
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("activity_logs", "metadata")

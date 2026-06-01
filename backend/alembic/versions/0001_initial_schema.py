"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("endpoint_url", sa.String(length=512), nullable=False),
        sa.Column("owner_name", sa.String(length=255), nullable=False),
        sa.Column("version", sa.String(length=50), nullable=False),
        sa.Column("cost_credits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_healthy", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_health_check", sa.DateTime(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(), nullable=True),
        sa.Column("avg_response_time_ms", sa.Float(), nullable=True),
        sa.Column("total_sessions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("successful_sessions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_sessions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agents_id", "agents", ["id"], unique=False)

    op.create_table(
        "capabilities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("agent_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("input_schema", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("output_schema", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_capabilities_id", "capabilities", ["id"], unique=False)
    op.create_index("ix_capabilities_agent_id", "capabilities", ["agent_id"], unique=False)
    op.create_index("ix_capabilities_name", "capabilities", ["name"], unique=False)

    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("agent_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activity_logs_id", "activity_logs", ["id"], unique=False)
    op.create_index("ix_activity_logs_event_type", "activity_logs", ["event_type"], unique=False)
    op.create_index("ix_activity_logs_agent_id", "activity_logs", ["agent_id"], unique=False)
    op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"], unique=False)

    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("requester_agent_id", sa.Integer(), nullable=False),
        sa.Column("worker_agent_id", sa.Integer(), nullable=True),
        sa.Column("capability", sa.String(length=255), nullable=False),
        sa.Column("task_type", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("input_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("output_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["requester_agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["worker_agent_id"], ["agents.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sessions_id", "sessions", ["id"], unique=False)
    op.create_index("ix_sessions_requester_agent_id", "sessions", ["requester_agent_id"], unique=False)
    op.create_index("ix_sessions_worker_agent_id", "sessions", ["worker_agent_id"], unique=False)
    op.create_index("ix_sessions_capability", "sessions", ["capability"], unique=False)
    op.create_index("ix_sessions_status", "sessions", ["status"], unique=False)
    op.create_index("ix_sessions_created_at", "sessions", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_sessions_created_at", table_name="sessions")
    op.drop_index("ix_sessions_status", table_name="sessions")
    op.drop_index("ix_sessions_capability", table_name="sessions")
    op.drop_index("ix_sessions_worker_agent_id", table_name="sessions")
    op.drop_index("ix_sessions_requester_agent_id", table_name="sessions")
    op.drop_index("ix_sessions_id", table_name="sessions")
    op.drop_table("sessions")

    op.drop_index("ix_activity_logs_created_at", table_name="activity_logs")
    op.drop_index("ix_activity_logs_agent_id", table_name="activity_logs")
    op.drop_index("ix_activity_logs_event_type", table_name="activity_logs")
    op.drop_index("ix_activity_logs_id", table_name="activity_logs")
    op.drop_table("activity_logs")

    op.drop_index("ix_capabilities_name", table_name="capabilities")
    op.drop_index("ix_capabilities_agent_id", table_name="capabilities")
    op.drop_index("ix_capabilities_id", table_name="capabilities")
    op.drop_table("capabilities")

    op.drop_index("ix_agents_id", table_name="agents")
    op.drop_table("agents")

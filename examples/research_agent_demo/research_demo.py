#!/usr/bin/env python3
"""
Multi-Agent Research Workflow Demo v0.1

Orchestrates search + summarization through CLOZR Exchange (no hardcoded worker URLs).

Usage:
  export RESEARCH_AGENT_ID=<registered requester id>
  python research_demo.py "What are AI agents?"
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from typing import Any

import httpx

from clozr_client import ClozrClient, ClozrClientError
from workflow_utils import search_results_to_text

WORKFLOW_NAME = "research_workflow"


def run_workflow(question: str, requester_agent_id: int, client: ClozrClient) -> dict[str, Any]:
    workflow_id = str(uuid.uuid4())
    trace: dict[str, Any] = {
        "workflow_id": workflow_id,
        "workflow_name": WORKFLOW_NAME,
        "question": question,
        "steps": [],
    }

    client.log_workflow_event(
        "workflow_started",
        workflow_id=workflow_id,
        workflow_name=WORKFLOW_NAME,
        message=f"Research workflow started — question: {question}",
        agent_id=requester_agent_id,
        status="in_progress",
        question=question,
    )

    try:
        client.log_workflow_event(
            "workflow_step_started",
            workflow_id=workflow_id,
            workflow_name=WORKFLOW_NAME,
            message="Step started: web_search",
            agent_id=requester_agent_id,
            step_index=1,
            capability="web_search",
            task_type="search_query",
            status="running",
            question=question,
        )

        search_dispatch = client.dispatch(
            requester_agent_id=requester_agent_id,
            capability="web_search",
            task_type="search_query",
            input_payload={"query": question},
        )
        trace["steps"].append(
            {
                "step": 1,
                "capability": "web_search",
                "session_id": search_dispatch["session_id"],
                "status": search_dispatch["status"],
                "worker_agent_id": search_dispatch.get("worker_agent_id"),
            }
        )
        if search_dispatch["status"] != "completed":
            raise ClozrClientError(
                f"Search step failed: {search_dispatch.get('error_message', 'unknown error')}"
            )

        client.log_workflow_event(
            "workflow_step_completed",
            workflow_id=workflow_id,
            workflow_name=WORKFLOW_NAME,
            message=f"Step completed: web_search (session {search_dispatch['session_id']})",
            agent_id=requester_agent_id,
            step_index=1,
            capability="web_search",
            task_type="search_query",
            session_id=search_dispatch["session_id"],
            worker_agent_id=search_dispatch.get("worker_agent_id"),
            status=search_dispatch["status"],
            question=question,
        )

        output = search_dispatch.get("output_payload") or {}
        results = output.get("results", [])
        search_text = search_results_to_text(results)

        client.log_workflow_event(
            "workflow_step_started",
            workflow_id=workflow_id,
            workflow_name=WORKFLOW_NAME,
            message="Step started: summarization",
            agent_id=requester_agent_id,
            step_index=2,
            capability="summarization",
            task_type="summarize_text",
            status="running",
            question=question,
        )

        summary_dispatch = client.dispatch(
            requester_agent_id=requester_agent_id,
            capability="summarization",
            task_type="summarize_text",
            input_payload={"text": search_text},
        )
        trace["steps"].append(
            {
                "step": 2,
                "capability": "summarization",
                "session_id": summary_dispatch["session_id"],
                "status": summary_dispatch["status"],
                "worker_agent_id": summary_dispatch.get("worker_agent_id"),
            }
        )
        if summary_dispatch["status"] != "completed":
            raise ClozrClientError(
                f"Summarization step failed: {summary_dispatch.get('error_message', 'unknown error')}"
            )

        client.log_workflow_event(
            "workflow_step_completed",
            workflow_id=workflow_id,
            workflow_name=WORKFLOW_NAME,
            message=(
                f"Step completed: summarization (session {summary_dispatch['session_id']})"
            ),
            agent_id=requester_agent_id,
            step_index=2,
            capability="summarization",
            task_type="summarize_text",
            session_id=summary_dispatch["session_id"],
            worker_agent_id=summary_dispatch.get("worker_agent_id"),
            status=summary_dispatch["status"],
            question=question,
        )

        summary_output = summary_dispatch.get("output_payload") or {}
        summary = summary_output.get("summary", str(summary_output))

        brief = {
            "question": question,
            "sources_found": len(results),
            "search_results": results,
            "summary": summary,
            "workflow_status": "completed",
            "workflow_trace": trace,
        }

        client.log_workflow_event(
            "workflow_completed",
            workflow_id=workflow_id,
            workflow_name=WORKFLOW_NAME,
            message=(
                f"Research workflow completed — {len(results)} sources, "
                f"summary length {len(summary)} chars"
            ),
            agent_id=requester_agent_id,
            status="completed",
            question=question,
        )

        return brief

    except Exception as exc:
        client.log_workflow_event(
            "workflow_failed",
            workflow_id=workflow_id,
            workflow_name=WORKFLOW_NAME,
            message=f"Research workflow failed: {exc}",
            agent_id=requester_agent_id,
            status="failed",
            question=question,
            error_message=str(exc),
        )
        raise


def _print_brief(brief: dict[str, Any]) -> None:
    print("\n" + "=" * 60)
    print("MULTI-AGENT RESEARCH WORKFLOW (via CLOZR)")
    print("=" * 60)
    print(f"\nQuestion:\n  {brief['question']}\n")
    print("Search Results:")
    for hit in brief.get("search_results", []):
        print(f"  • {hit.get('title')}")
        print(f"    {hit.get('snippet')}")
    print(f"\nSummary:\n  {brief['summary']}\n")
    print("Final Research Brief:")
    print(json.dumps(
        {
            "question": brief["question"],
            "sources_found": brief["sources_found"],
            "summary": brief["summary"],
            "workflow_status": brief["workflow_status"],
        },
        indent=2,
    ))
    print("\nWorkflow trace:")
    print(json.dumps(brief["workflow_trace"], indent=2))
    print("=" * 60 + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run multi-agent research workflow through CLOZR Exchange",
    )
    parser.add_argument(
        "question",
        nargs="?",
        default="What are AI agents?",
        help="Research question (default: What are AI agents?)",
    )
    args = parser.parse_args()

    requester_id = os.environ.get("RESEARCH_AGENT_ID")
    if not requester_id:
        print(
            "Error: set RESEARCH_AGENT_ID to your registered Research Agent id.\n"
            "See docs/demos/multi-agent-workflow-demo.md",
            file=sys.stderr,
        )
        return 1

    client = ClozrClient()
    try:
        brief = run_workflow(args.question, int(requester_id), client)
    except ClozrClientError as exc:
        print(f"Workflow failed: {exc}", file=sys.stderr)
        return 1
    except httpx.HTTPError as exc:
        print(f"HTTP error: {exc}", file=sys.stderr)
        return 1

    _print_brief(brief)
    return 0


if __name__ == "__main__":
    sys.exit(main())

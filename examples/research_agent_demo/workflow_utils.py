"""Shared helpers for the research workflow demo (no CLOZR backend imports)."""

from typing import Any


def search_results_to_text(results: list[dict[str, Any]]) -> str:
    """Flatten search hits into text for the summarizer."""
    if not results:
        return "No search results returned."
    lines = []
    for i, hit in enumerate(results, start=1):
        title = hit.get("title", "(no title)")
        snippet = hit.get("snippet", "")
        source = hit.get("source", "unknown")
        lines.append(f"{i}. {title}\n   {snippet}\n   Source: {source}")
    return "\n\n".join(lines)

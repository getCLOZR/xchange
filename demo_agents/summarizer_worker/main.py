from demo_agents.summarizer_worker_common import create_summarizer_app

app = create_summarizer_app(
    agent_name="Demo Summarizer Agent",
    agent_version="1.0.0",
    title_suffix="(legacy port 9001)",
)

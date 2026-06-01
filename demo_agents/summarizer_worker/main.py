from demo_agents.summarizer_worker_common import create_summarizer_app

app = create_summarizer_app(
    worker_id="demo-summarizer-agent",
    worker_label="Summarizer (legacy)",
    title_suffix="(legacy port 9001)",
)

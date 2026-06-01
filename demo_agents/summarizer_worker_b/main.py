from demo_agents.summarizer_worker_common import create_summarizer_app

app = create_summarizer_app(
    worker_id="demo-summarizer-worker-b",
    worker_label="Summarizer B",
    title_suffix="B",
)

from demo_agents.summarizer_worker_common import create_summarizer_app

app = create_summarizer_app(
    worker_id="demo-summarizer-worker-a",
    worker_label="Summarizer A",
    title_suffix="A",
)

# External agents

Agents in this directory are **independent services**. They implement only the public [Gleam Agent Contract v0.1](../docs/specs/clozr-agent-contract-v0.1.md):

- `GET /health`
- `POST /execute`

They do **not** import `backend/app` models, services, or schemas.

| Agent | Port | Capability | README |
|-------|------|------------|--------|
| Weather | 9101 | `weather_lookup` | [weather_agent/README.md](weather_agent/README.md) |
| Translator | 9102 | `translation` | [translator_agent/README.md](translator_agent/README.md) |
| Search | 9103 | `web_search` | [search_agent/README.md](search_agent/README.md) |
| Photo Processing | 9205 | `photo_processing` | [photo_processing_agent/README.md](photo_processing_agent/README.md) |
| Product Research | 9201 | `product_research` | [product_research_agent/main.py](product_research_agent/main.py) |
| SEO Keywords | 9202 | `seo_keywords` | [seo_keyword_agent/main.py](seo_keyword_agent/main.py) |
| Product Copy | 9203 | `product_copy` | [product_copy_agent/main.py](product_copy_agent/main.py) |
| Marketing Copy | 9204 | `marketing_copy` | [marketing_copy_agent/main.py](marketing_copy_agent/main.py) |

Use these to prove Gleam can orchestrate third-party workers that only know the contract.

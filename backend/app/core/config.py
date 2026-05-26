from functools import lru_cache

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    database_url: str = (
        "postgresql://postgres:postgres@localhost:5432/clozr_exchange"
    )
    app_name: str = "CLOZR Exchange API"
    debug: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()

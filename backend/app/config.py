from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://glossarion:change_me@db:5432/glossarion"
    libretranslate_url: str = "http://libretranslate:3000"
    cors_origins: str = "http://localhost:80,http://localhost:5173"
    source_language: str = "en"
    target_languages: str = "de,fr,es"
    jwt_secret: str = "change-this-secret-in-production-use-long-random-string"
    
    @property
    def target_language_list(self) -> list[str]:
        return [lang.strip() for lang in self.target_languages.split(",")]
    
    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()

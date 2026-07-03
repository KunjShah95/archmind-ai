import logging
from functools import lru_cache

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Load .env into os.environ so modules that read os.environ directly
# (e.g. services/llm.py provider discovery) see the same values pydantic does.
load_dotenv()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./archmind.db"
    uploads_dir: str = "./uploads"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080"

    # Supabase JWT validation (set when using Supabase auth)
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_service_role_key: str = ""

    # Dev mode: allow demo login without Supabase.
    # Defaults to False so a deployment must opt in explicitly via DEV_MODE=true.
    dev_mode: bool = False
    dev_jwt_secret: str = "archmind-dev-secret-change-in-production"

    max_upload_bytes: int = 25 * 1024 * 1024
    analyses_limit_hobby: int = 10

    def model_post_init(self, __context) -> None:
        if self.dev_jwt_secret == "archmind-dev-secret-change-in-production":
            logger.warning(
                "DEV_JWT_SECRET is still the insecure default. "
                "Override it via .env or environment variable for any non-local deployment."
            )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

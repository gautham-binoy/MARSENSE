from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MARSENSE_", env_file=PROJECT_DIR / ".env", extra="ignore")

    data_dir: Path = PROJECT_DIR / "data"
    database_url: str = ""  # empty -> sqlite in data_dir
    offline: bool = False  # never hit the network; use cached data only
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"]
    max_download_mb: int = 400  # safety cap for any single remote file
    log_level: str = "INFO"
    # ingestion sampling (keeps the download budget small)
    meda_sample_sols: list[int] = [10, 94, 180, 300, 420, 540, 780, 1020]  # PDS Atmospheres is slow (~5 MB/sol)
    rad_sample_sols: list[int] = [90, 180, 300, 420]

    @property
    def raw_dir(self) -> Path:
        return self.data_dir / "raw"

    @property
    def processed_dir(self) -> Path:
        return self.data_dir / "processed"

    @property
    def metadata_dir(self) -> Path:
        return self.data_dir / "metadata"

    @property
    def cache_dir(self) -> Path:
        return self.data_dir / "cache"

    @property
    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite:///{(self.data_dir / 'marsense.db').as_posix()}"


settings = Settings()
for _d in (settings.raw_dir, settings.processed_dir, settings.metadata_dir, settings.cache_dir):
    _d.mkdir(parents=True, exist_ok=True)

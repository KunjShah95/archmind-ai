from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False, "timeout": 15} if settings.database_url.startswith("sqlite") else {}
engine_kwargs: dict = {
    "connect_args": connect_args,
    "pool_size": 10,
    "max_overflow": 20,
    "pool_pre_ping": True,
    "pool_recycle": 3600,
}
if settings.database_url.startswith("sqlite"):
    for k in ("pool_size", "max_overflow", "pool_pre_ping", "pool_recycle"):
        engine_kwargs.pop(k, None)
engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# backend/ root — holds alembic.ini and the alembic/ package.
BACKEND_ROOT = Path(__file__).resolve().parent.parent

if settings.database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Bring the database schema up to date by running Alembic migrations.

    Alembic is the sole schema authority — models must never be applied via
    create_all(). New model changes require a migration
    (`alembic revision --autogenerate`) which this upgrades to head on boot.
    """
    from alembic import command
    from alembic.config import Config

    alembic_cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    command.upgrade(alembic_cfg, "head")

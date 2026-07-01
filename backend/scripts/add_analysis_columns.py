"""One-off migration: add Phase-1 columns to analyses table.

create_all() only creates missing tables, it does not ALTER existing ones,
so columns added to the Analysis model after the table already existed in
Postgres must be added manually. Idempotent (IF NOT EXISTS).
"""
from sqlalchemy import text

from app.database import engine

STATEMENTS = [
    "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS analysis_mode VARCHAR(32) NOT NULL DEFAULT 'review'",
    "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS generation_prompt TEXT",
    "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS generated_artifacts JSON",
    "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS mediator_report JSON",
]


def main() -> None:
    with engine.begin() as conn:
        for stmt in STATEMENTS:
            conn.execute(text(stmt))
            print(f"OK: {stmt}")
    print("Done.")


if __name__ == "__main__":
    main()

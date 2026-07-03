#!/usr/bin/env python3
import os

import uvicorn

if __name__ == "__main__":
    # reload=True enables auto-restart on file changes (handy in dev) but the
    # underlying file-watcher (watchfiles) adds ~2 s to cold-start on Windows.
    # Set RELOAD=false to disable in production or when startup time matters.
    reload = os.getenv("RELOAD", "true").lower() == "true"
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=reload)

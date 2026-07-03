# tests/conftest.py

import sys
import os
from pathlib import Path

# Add the project root and backend directory to the Python path
project_root = str(Path(__file__).parent.parent)
backend_dir = str(Path(__file__).parent.parent / "backend")

if project_root not in sys.path:
    sys.path.insert(0, project_root)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import fixtures from the backend if they exist
pytest_plugins = []
if os.path.exists(os.path.join(backend_dir, "conftest.py")):
    pytest_plugins.append("backend.conftest")
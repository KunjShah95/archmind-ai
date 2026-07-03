"""Import a public GitHub repository and derive an architecture diagram.

Fetches the repo file tree via the public GitHub API (no token needed for
public repos), detects the major architectural components from well-known
files and directories, and emits a Mermaid flowchart that the standard
analysis pipeline can parse.
"""

import re

import httpx

GITHUB_API = "https://api.github.com"
_REPO_RE = re.compile(
    r"^(?:https?://)?(?:www\.)?github\.com/([\w.-]+)/([\w.-]+?)(?:\.git)?/?$"
)


def parse_repo_url(url: str) -> tuple[str, str]:
    m = _REPO_RE.match((url or "").strip())
    if not m:
        raise ValueError("Enter a GitHub repository URL like https://github.com/owner/repo")
    return m.group(1), m.group(2)


def fetch_repo_tree(owner: str, repo: str) -> tuple[list[str], str]:
    """Return (file paths, default branch) for a public repository."""
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "archmind-ai"}
    with httpx.Client(timeout=20.0, headers=headers) as client:
        meta = client.get(f"{GITHUB_API}/repos/{owner}/{repo}")
        if meta.status_code == 404:
            raise ValueError("Repository not found. Only public repositories are supported.")
        if meta.status_code == 403:
            raise ValueError("GitHub API rate limit reached. Try again in a few minutes.")
        meta.raise_for_status()
        branch = meta.json().get("default_branch", "main")

        tree = client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{branch}",
            params={"recursive": "1"},
        )
        tree.raise_for_status()
        paths = [t["path"] for t in tree.json().get("tree", []) if t.get("type") == "blob"]
    return paths, branch


# Each detector: (node id, label, predicate over lowercase paths)
_DETECTORS: list[tuple[str, str, callable]] = [
    ("frontend", "Frontend (Web UI)", lambda p: any(
        x in p for x in ("package.json", "package-lock.json", "bun.lockb", "yarn.lock", "vite.config", "next.config"))),
    ("mobile", "Mobile App", lambda p: any(
        x in p for x in ("pubspec.yaml", "ios/podfile", "android/build.gradle"))),
    ("api", "Backend API", lambda p: any(
        x in p for x in ("requirements.txt", "pyproject.toml", "go.mod", "pom.xml",
                          "build.gradle", "cargo.toml", "composer.json", "gemfile"))),
    ("db", "Database", lambda p: any(
        x in p for x in ("migrations/", "alembic/", "prisma/schema.prisma", ".sql"))),
    ("cache", "Cache / Queue", lambda p: any(
        x in p for x in ("redis", "celery", "rabbitmq", "kafka", "bullmq"))),
    ("docker", "Containers (Docker)", lambda p: any(
        x in p for x in ("dockerfile", "docker-compose"))),
    ("k8s", "Kubernetes", lambda p: any(
        x in p for x in ("k8s/", "kubernetes/", "helm/", "charts/"))),
    ("iac", "Infrastructure as Code", lambda p: any(
        x in p for x in (".tf", "cloudformation", "pulumi"))),
    ("ci", "CI/CD Pipeline", lambda p: any(
        x in p for x in (".github/workflows/", ".gitlab-ci", "jenkinsfile", ".circleci"))),
    ("tests", "Test Suite", lambda p: any(
        x in p for x in ("tests/", "test/", "__tests__/", ".spec.", ".test."))),
    ("docs", "Documentation", lambda p: any(
        x in p for x in ("docs/", "readme"))),
]

# Edges drawn only when both endpoints were detected.
_EDGES = [
    ("frontend", "api"), ("mobile", "api"), ("api", "db"), ("api", "cache"),
    ("docker", "api"), ("k8s", "docker"), ("iac", "k8s"), ("iac", "db"),
    ("ci", "docker"), ("ci", "tests"), ("tests", "api"),
]


def repo_to_mermaid(paths: list[str]) -> str:
    lowered = [p.lower() for p in paths]

    def hit(predicate) -> bool:
        return any(predicate(p) for p in lowered)

    detected = [(nid, label) for nid, label, pred in _DETECTORS if hit(pred)]
    if not detected:
        raise ValueError("Could not detect any architecture components in this repository.")

    ids = {nid for nid, _ in detected}
    lines = ["flowchart TD"]
    for nid, label in detected:
        lines.append(f'    {nid}["{label}"]')
    for a, b in _EDGES:
        if a in ids and b in ids:
            lines.append(f"    {a} --> {b}")
    return "\n".join(lines)


def import_github_repo(repo_url: str) -> tuple[str, str]:
    """Return (analysis name, mermaid source) for a repository URL."""
    owner, repo = parse_repo_url(repo_url)
    paths, _branch = fetch_repo_tree(owner, repo)
    mermaid = repo_to_mermaid(paths)
    return f"{owner}/{repo}", mermaid

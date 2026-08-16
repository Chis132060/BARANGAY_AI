import os

docs = [
    "api-security.md",
    "graphql-security.md",
    "api-quality.md",
    "session-management.md",
    "data-retention.md",
    "access-control.md",
    "logging-monitoring.md",
    "business-continuity.md",
    "qa-policy.md",
    "qc-policy.md",
    "testing-strategy.md",
    "release-management.md"
]

os.makedirs("docs/compliance", exist_ok=True)
for doc in docs:
    title = doc.replace("-", " ").replace(".md", "").title()
    with open(f"docs/compliance/{doc}", "w") as f:
        f.write(f"# {title}\n\nThis document records the actual implemented state of the AI Brain for ISO alignment.\n")

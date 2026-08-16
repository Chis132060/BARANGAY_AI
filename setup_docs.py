import os

docs = [
    "ai-system-inventory.md",
    "ai-risk-register.md",
    "model-inventory.md",
    "provider-inventory.md",
    "data-classification.md",
    "security-controls.md",
    "threat-model.md",
    "incident-management.md",
    "change-management.md",
    "backup-recovery.md",
    "ai-evaluation.md",
    "audit-log-policy.md"
]

os.makedirs("docs/compliance", exist_ok=True)
for doc in docs:
    title = doc.replace("-", " ").replace(".md", "").title()
    with open(f"docs/compliance/{doc}", "w") as f:
        f.write(f"# {title}\n\nThis document records the actual implemented state of the AI Brain for ISO alignment.\n")

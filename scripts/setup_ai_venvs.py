#!/usr/bin/env python3
"""Create per-service Python virtual environments for the AI services layer.

Usage:
    python scripts/setup_ai_venvs.py             # create venvs + runtime deps
    python scripts/setup_ai_venvs.py --with-ml   # also install heavy ML deps (torch/f5-tts)
"""

import argparse
import os
import subprocess
import sys
import venv

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVICES = ["pdf-processor", "translation", "tts"]


def service_dir(name: str) -> str:
    return os.path.join(ROOT, "services", "ai", name)


def venv_python(venv_dir: str) -> str:
    if os.name == "nt":
        return os.path.join(venv_dir, "Scripts", "python.exe")
    return os.path.join(venv_dir, "bin", "python")


def run(cmd: list, cwd: str) -> None:
    print(f"\n>> {' '.join(cmd)}")
    subprocess.check_call(cmd, cwd=cwd)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--with-ml", action="store_true", help="Install heavy ML deps (f5-tts/torch) for the TTS service.")
    parser.add_argument("--services", nargs="*", default=SERVICES, help="Subset of services to provision.")
    args = parser.parse_args()

    for name in args.services:
        if name not in SERVICES:
            print(f"Unknown service '{name}', skipping.")
            continue

        sdir = service_dir(name)
        if not os.path.isdir(sdir):
            print(f"Service directory missing: {sdir}")
            continue

        venv_dir = os.path.join(sdir, ".venv")
        py = venv_python(venv_dir)

        if not os.path.isfile(py):
            print(f"\nCreating virtualenv for {name} ...")
            venv.create(venv_dir, with_pip=True)

        dev_req = os.path.join(sdir, "requirements-dev.txt")
        if os.path.isfile(dev_req):
            run([py, "-m", "pip", "install", "--upgrade", "pip"], sdir)
            run([py, "-m", "pip", "install", "-r", "requirements.txt"], sdir)
            run([py, "-m", "pip", "install", "-r", "requirements-dev.txt"], sdir)
        else:
            run([py, "-m", "pip", "install", "-r", "requirements.txt"], sdir)

        if args.with_ml and name == "tts":
            ml_req = os.path.join(sdir, "requirements-ml.txt")
            if os.path.isfile(ml_req):
                run([py, "-m", "pip", "install", "-r", ml_req], sdir)

    print("\nDone. Activate a service venv and run e.g.:")
    print("  services\\ai\\pdf-processor\\.venv\\Scripts\\python -m pytest -q  (Windows)")
    print("  services/ai/pdf-processor/.venv/bin/python -m pytest -q        (macOS/Linux)")


if __name__ == "__main__":
    main()
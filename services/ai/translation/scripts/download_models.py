#!/usr/bin/env python3
"""Download and unpack Lingvanex CTranslate2 translation models for en↔ceb.

The model artifacts are published by the Lingvanex ML team on an S3 bucket and
are NOT distributed via this repository. This script fetches them locally into
services/ai/translation/models/ following the layout the service expects:

    models/en_ceb/{model.bin, en.spm.model, ceb.spm.model}
    models/ceb_en/{model.bin, ceb.spm.model, en.spm.model}

The model artifact license/terms have not been explicitly published by the
vendor — confirm the terms of use before using these weights outside this
project. See docs/OPEN_SOURCE.md (Lingvanex entry).

Usage:
    python services/ai/translation/scripts/download_models.py [--dir PATH]
"""

import argparse
import os
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

# Official links from the lingvanex-mt/models repository README.
MODEL_URLS = {
    "en_ceb": "https://models-for-github.s3.eu-central-1.amazonaws.com/en_ceb.zip",
    "ceb_en": "https://models-for-github.s3.eu-central-1.amazonaws.com/ceb_en.zip",
}

DEFAULT_ROOT = Path(__file__).resolve().parents[2] / "models"


def _download(url: str, dest: Path) -> None:
    print(f"Downloading {url} -> {dest.name}")
    req = urllib.request.Request(url, headers={"User-Agent": "barangay-ai-utils/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp, dest.open("wb") as out:
        total = int(resp.headers.get("Content-Length", 0))
        written = 0
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            out.write(chunk)
            written += len(chunk)
    print(f"  downloaded {written / 1024 / 1024:.1f} MB")


def _unzip(zip_path: Path, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(target)
    # Some zips wrap contents in a single top-level directory; flatten it.
    children = [p for p in target.iterdir()]
    if len(children) == 1 and children[0].is_dir():
        inner = children[0]
        for item in inner.iterdir():
            shutil.move(str(item), str(target / item.name))
        inner.rmdir()
    zip_path.unlink()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", type=Path, default=DEFAULT_ROOT, help="Model root directory.")
    parser.add_argument("--pairs", nargs="*", default=list(MODEL_URLS), help="Which pairs to fetch.")
    args = parser.parse_args()

    root: Path = args.dir
    root.mkdir(parents=True, exist_ok=True)

    for pair in args.pairs:
        if pair not in MODEL_URLS:
            print(f"Unknown pair '{pair}'. Available: {', '.join(MODEL_URLS)}")
            return 2
        target = root / pair
        if target.is_dir() and (target / "model.bin").is_file():
            print(f"  {pair}: already present, skipping.")
            continue
        with tempfile.TemporaryDirectory() as tmp:
            zip_path = Path(tmp) / "model.zip"
            _download(MODEL_URLS[pair], zip_path)
            _unzip(zip_path, target)

    print("\nDone. Model layout:")
    for pair in MODEL_URLS:
        print(f"  {root / pair}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
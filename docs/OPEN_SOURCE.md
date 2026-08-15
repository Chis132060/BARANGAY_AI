# Open Source & Third-Party Dependencies

This document centralizes license review for every external component used by Barangay AI.
All integration code we write is `MIT OR Apache-2.0` (per component) — but several
**pretrained model weights we ship are NOT** under permissive licenses. That distinction is
the single most important compliance risk on this project.

> **Bottom line:** software licenses and **model/data licenses are different rights**.
> MIT/Apache code does NOT make the weights MIT. Verify each item below before
> any commercial or government deployment.

## First-party code

| Component | License | Notes |
| --- | --- | --- |
| All `apps/`, `packages/`, `services/` source we author | Barangay AI | Capstone project; no upstream dependency is vendored into these trees. |

## AI services runtime (code)

| Library | License | Used by |
| --- | --- | --- |
| FastAPI / Starlette / Uvicorn / Pydantic | BSD-3-Clause / MIT | all services |
| OpenDataLoader PDF (`opendataloader-pdf`) | Apache-2.0 | pdf-processor |
| CTranslate2 | MIT | translation |
| SentencePiece | Apache-2.0 | translation |
| F5-TTS (`f5-tts`) | **MIT** | tts |
| PyTorch / torchaudio | BSD-3-Clause | tts |
| soundfile / numpy | BSD-3-Clause (FFmpeg libs LGPL) | tts |

## Pretrained models & data (the compliance red zone)

| Model | Purpose | License | Status |
| --- | --- | --- | --- |
| OpenDataLoader internal models | PDF layout analysis | Apache-2.0 (per project) | OK |
| Lingvanex `en_ceb` / `ceb_en` CTranslate2 zips | MT | **REQUIRES VERIFICATION** — Lingvanex releases bilingual models for one-time commercial licensing; free tiers are research/development only | ⚠ verify commercial terms |
| F5-TTS `F5TTS_v1_Base`, E2-TTS | TTS voice cloning | **CC-BY-NC 4.0** — trained on Emilia, non-commercial only | ⚠ **non-commercial** |
| Emilia dataset (upstream training data) | TTS training data | CC-BY-NC 4.0; some covered subsets have own terms | ⚠ |
| Reference voice clip (Barangay tampon) | TTS prompt | **your own recording** — must have the speaker's consent / be a public-domain government figure | ⚠ consent |

### What this means for the Barangay AI use case

- The barangay residents portal is a **government / civic (non-profit) service**. Whether that
  counts as "commercial" under CC-BY-NC depends on your LGU's operational model. **Assume NC =
  does not apply and budget for commercial licensing** in the ROADMAP if the LGU monetizes or
  the agency sells this.
- Options if NC is a blocker:
  1. Train (or license) a permissive TTS model, e.g. Coqui XTTS (check current license,
     historically NPL/CPML — **verify**), Orca/Parler, or a locally fine-tuned VITS that you
     train yourself on your own licensed data.
  2. Buy a commercial F5-TTS/E2-TTS weight license from the maintainers if offered.
  3. Keep the reference clip short (<~10 s) and clearly attribute the source speaker.
- For translation, Lingvanex models are the quickest path to a good en↔ceb pair. If their
  free terms don't cover this deployment, evaluate OPUS-MT (CC-BY-4.0 weights, run on
  CTranslate2) as a drop-in replacement — the translation service already abstracts the
  model behind one interface.

## Frontend / other ecosystem

| Package | License | Notes |
| --- | --- | --- |
| Next.js, React, TypeScript, Tailwind | MIT | apps |
| Supabase (client + self-hosted) | Apache-2.0 / MIT | auth + Postgres (PostgreSQL license) |
| `pdf-parse`, `mammoth` | MIT | app-side document split/upload |
| Others (see `package.json` lockfiles) | MIT/Apache | run `npx license-checker` before release for the full manifest |

## Process

1. Every new runtime dependency must be added here with its license and a compliance note.
2. Before any release/deployment, run a full dependency-license scan for BOTH npm
   (`npx license-checker --summary`) and Python (`pip-licenses`).
3. Model weights are never committed to the repo — see `services/ai/translation/README.md`
   and `services/ai/tts/README.md` for how each is pulled at deploy time.
4. Record any model-license decisions in the responsible-deployment section of
   `docs/ROADMAP.md`.
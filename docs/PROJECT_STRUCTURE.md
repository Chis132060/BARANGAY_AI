# Project Structure

## Purpose

This document defines the recommended repository structure for Smart Barangay.

## Overview

The workspace should be organized as a multi-application repository containing web, mobile, backend, shared packages, infrastructure, and documentation. The current documentation is a baseline for creating that structure.

## Architecture

```text
.
|-- apps/
|   |-- web/
|   |-- mobile/
|   `-- api/
|-- packages/
|   |-- shared-types/
|   `-- ui/
|-- infra/
|   |-- docker/
|   |-- supabase/
|   `-- ci/
|-- docs/
`-- README.md
```

## Implementation Details

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js web portal |
| `apps/mobile` | React Native or PWA mobile app |
| `apps/api` | FastAPI backend |
| `packages/shared-types` | Shared generated or manually maintained contracts |
| `packages/ui` | Reusable UI package if multiple clients need it |
| `infra/supabase` | Migrations, seed data, local config |
| `infra/docker` | Local development containers |
| `docs` | Engineering documentation |

## Design Decisions

A monorepo-style structure keeps related applications and documentation together while preserving clear app boundaries. Shared packages should be introduced only when duplication becomes meaningful.

## Advantages

- Easier cross-layer development.
- Documentation lives near implementation.
- CI can validate frontend, backend, schema, and docs together.

## Disadvantages

- Requires tooling discipline for dependency boundaries.
- CI may become slower without scoped jobs.
- Shared packages can create coupling if overused.

## Security Considerations

Keep environment files out of source control. Separate frontend public variables from backend secrets. Infrastructure files must not contain production credentials.

## Performance Considerations

Use CI caching and scoped checks to avoid running every job for documentation-only changes. Keep generated artifacts out of commits unless they are required contracts.

## Future Improvements

- Add root workspace tooling after apps are scaffolded.
- Add dependency boundary checks.
- Add generated architecture diagrams from source.
- Add documentation publishing pipeline.

## References

- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
- [CI_CD.md](CI_CD.md)
- [DOCKER.md](DOCKER.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)


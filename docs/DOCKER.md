# Docker

## Purpose

This document defines Docker usage for Smart Barangay local development, testing, and backend deployment support.

## Overview

Docker should provide repeatable local services and optional containerized API execution. Managed services remain the production target, but containers help developers run compatible environments.

## Architecture

| Container | Purpose |
| --- | --- |
| `api` | FastAPI application |
| `db` | Local PostgreSQL if Supabase local is not used |
| `worker` | Optional background job processor |
| `test` | Isolated test runner |

## Implementation Details

Docker files should use small base images, pinned dependency versions, non-root users where practical, health checks, and environment variable injection. Compose files should be development-only unless explicitly adapted for production.

## Design Decisions

Docker is used to reduce setup differences, not to hide application configuration. Supabase local development may replace a custom PostgreSQL container when Auth, Storage, Realtime, and pgvector need parity.

## Advantages

- Reproducible local API runtime.
- Easier onboarding for backend developers.
- Supports CI test environments.

## Disadvantages

- Docker can add overhead on low-spec machines.
- Supabase local and custom Compose stacks can conflict if both are used.
- Container builds require cache management.

## Security Considerations

Do not bake secrets into images. Use non-root users when practical. Keep base images patched. Exclude local `.env` files and generated secrets from images.

## Performance Considerations

Use layer caching, dependency lockfiles, and slim images. Mount source only in development. Avoid unnecessary rebuilds for documentation-only changes.

## Future Improvements

- Add `docker-compose.yml` after app scaffolding.
- Add backend Dockerfile with production command.
- Add CI image build validation.
- Add local Supabase setup notes.

## References

- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- [CI_CD.md](CI_CD.md)
- [SECURITY.md](SECURITY.md)


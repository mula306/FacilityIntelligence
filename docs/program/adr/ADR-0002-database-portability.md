# ADR-0002: SQLite-First Portability Boundary

- Status: Accepted
- Date: 2026-03-29

## Decision

Use Prisma repositories and service boundaries so SQLite-specific behavior does not leak into controllers or UI, and keep IDs, timestamps, decimals, and soft-delete fields compatible with future SQL Server migration.

## Rationale

- The product must begin on SQLite without creating a rewrite wall for SQL Server.
- Repository and contract boundaries keep persistence details contained.

## Consequences

- Raw SQL should remain rare and isolated.
- Queries and schema design must stay ANSI-friendly and reviewable.

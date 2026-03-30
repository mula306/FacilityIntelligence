# ADR-0001: Monorepo and Core Stack

- Status: Accepted
- Date: 2026-03-29

## Decision

Use an npm workspaces monorepo with React and TypeScript for the web app, Fastify and TypeScript for the API, Prisma for SQLite-first persistence, and shared domain/contracts/ui packages.

## Rationale

- The program needs clean shared contracts and package ownership boundaries for parallel delivery.
- React and Fastify keep the stack maintainable and practical for enterprise admin workflows.
- Prisma supports SQLite now and SQL Server later with explicit migrations and a clean client boundary.

## Consequences

- Shared packages must be built before app builds.
- The repository must protect contract churn after feature tracks begin.

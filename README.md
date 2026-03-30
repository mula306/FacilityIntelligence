# Facility IT Intelligence Platform

Enterprise admin platform for healthcare facility technology intelligence, built as a greenfield TypeScript monorepo with SQLite-first portability toward SQL Server.

## Workspace Layout

- `apps/web`: React admin application
- `apps/api`: Fastify REST API
- `packages/domain`: shared domain entities and reference types
- `packages/contracts`: shared request and response contracts
- `packages/db`: Prisma schema, migrations, and seed data
- `packages/ui`: shared admin UI components
- `packages/jobs`: background job contracts and placeholders
- `docs/program`: roadmap, track records, ADRs, reviews, and risks

## Quick Start

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Run `npm run db:generate`.
4. Run `npm run db:migrate -- --name init`.
5. Run `npm run db:seed`.
6. Run `npm run build:packages`.
7. Run `npm run dev`.

## Delivery Status

This scaffold implements the program foundation plus the first executable tracks:

- `T00` Foundation and guardrails
- `T01` Admin shell, local auth, RBAC base, and audit base
- `T02` Core location hierarchy
- `T03` Hours and service areas
- `T04` Contacts and escalations
- `T05` Device and computer inventory
- `T06` Network and connectivity

Bootstrap accounts:

- `admin@facility.local` / `Facility123!`
- `ops@facility.local` / `Facility123!`

Later tracks are recorded and staged in `docs/program/tracks`.

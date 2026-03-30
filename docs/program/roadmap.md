# Program Roadmap

## Current State

- Program status: `active`
- Delivery mode: `monorepo`
- Architecture status: `contract-first foundation in place`
- Current completed tracks: `T00`, `T01`, `T02`, `T03`, `T04`, `T05`, `T06`, `T07`, `T08`, `T09`, `T10`
- Current in-flight tracks: `none`
- Next wave after current delivery: `T11`
- Wave C integration hardening: `completed`
- Wave D mapping delivery: `completed`
- Wave E Wi-Fi capture delivery: `completed`
- Wave F coverage analysis delivery: `completed`
- Wave G readiness and reporting delivery: `completed`

## Track Ledger

| Track | Title | Status | Wave | Notes |
|---|---|---|---|---|
| T00 | Foundation and Guardrails | Completed | A | Monorepo, docs ledger, CI, shared packages, migrations, and seed baseline are present. |
| T01 | Admin Shell, Auth, RBAC, Audit Base | Completed | B | Local auth, route guards, role-based navigation, audit emission, and audit review are implemented. |
| T02 | Core Location Hierarchy | Completed | B | Facility, building, floor, zone, and room foundation is implemented with list/detail/create/edit/archive support. |
| T03 | Hours and Service Areas | Completed | C | Service areas and hours workflows are implemented with overlap and overnight validation. |
| T04 | Contacts and Escalations | Completed | C | Contacts, roles, and facility-linked escalation assignments are implemented, including facility-level scope support. |
| T05 | Device and Computer Inventory | Completed | C | Device types and location-linked inventory workflows are implemented with archive workflow hardening. |
| T06 | Network and Connectivity | Completed | C | Circuits, profiles, access points, and connectivity measurements are implemented with archive and facility-scope hardening. |
| T07 | Floor Plans and Spatial Mapping | Completed | D | Floor plan versions, floor canvas controls, map annotations, and zone/room geometry workflows are implemented and wired into the admin shell. |
| T08 | Wi-Fi Scan Capture | Completed | E | Wi-Fi scan sessions, samples, CSV-assisted import, floor previews, and Wi-Fi admin-shell routing are implemented on the frozen spatial contract layer. |
| T09 | Coverage Analysis and Visualization | Completed | F | Coverage assessments, floor overlays, dead-zone annotation rebuilds, and the coverage admin workspace are implemented on the frozen T07/T08 contract layer. |
| T10 | Risk, Readiness, Reporting | Completed | G | Readiness scoring, incident and risk workflows, operational reporting, and seeded baseline data are implemented on top of T05, T06, and T09. |
| T11 | Administration, Import/Export, Portability Hardening | Planned | G | Runs after the core modules settle. |

## Shared Rules

- Shared package edits stay inside `T00` and reviewed contract tasks until a track is marked `contract-frozen`.
- Feature tracks own only their module directories in `apps/api/modules/<module>` and `apps/web/src/features/<module>`.
- Any shared contract change after track freeze must be logged in the owning track file and `review-log.md`.

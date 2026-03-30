# Risk Register

| ID | Risk | Impact | Mitigation | Status |
|---|---|---|---|---|
| R-001 | Shared contracts drift once multiple feature tracks start | High | Freeze shared contract changes behind explicit reviewed tasks and track entries. | Open |
| R-002 | SQLite-specific query assumptions leak into feature modules | High | Keep persistence behind repositories and review raw SQL before merge. | Open |
| R-003 | Auth placeholder grows into production auth by accident | Medium | Keep local auth clearly scoped as bootstrap-only and preserve SSO seam in auth service. | Open |
| R-004 | Mapping and Wi-Fi work starts before location hierarchy stabilizes | Medium | Gate T07 and T08 on T02 completion criteria. | Open |
| R-005 | Prisma 6.x currently reports a high-severity advisory in transitive config code | High | Plan a deliberate Prisma 7 upgrade in T11 after compatibility review and migration rehearsal. | Open |
| R-006 | Optional location foreign keys remain implicit in several Prisma models (`FacilityContactAssignment`, `Device`, `AccessPoint`, `Incident`, `RiskItem`, `ReadinessScore`) | Medium | Add explicit relation fields and a portability-safe migration in T11 so SQLite and future SQL Server schemas enforce the same integrity guarantees and readiness/reporting modules can stop relying on lookup-based enrichment. | Open |

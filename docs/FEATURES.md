# Feature status

Implementation status is distinct from live acceptance. The complete master-specification comparison is in [REQUIREMENTS_GAPS.md](REQUIREMENTS_GAPS.md).

| Module                | Implemented                                                                                                                                 | Remaining                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Foundation/auth       | Next.js, Slovak design, 18 RLS tables, typed Supabase, additive roles, invitations/recovery/bootstrap                                       | Live Auth/SMTP/session acceptance; invite reconciliation                                             |
| Members/teams         | CRUD, archive, family links, paginated directories, searchable assignments                                                                  | Scoped parent/coach profile views; detail-list pagination                                            |
| Calendar/events       | Month/week/agenda, mobile agenda, recurrence/exceptions, matches, searchable event team selection                                           | Calendar/filter scale limits; availability indicators                                                |
| Attendance            | Separate availability/actual participation, coach correction/audit, paginated filtered history and complete SQL totals                      | Event-detail scale limits; pending-response notifications                                            |
| Communication         | Multi-team/named-member audiences, important/search/archive pagination, immutable author, audit, scoped/deduplicated audience notifications | Scheduled reminders; live UI acceptance                                                              |
| Finance               | Fee plans, charges, partial payments, reversals, immutable audited charge-total corrections, exact aggregates and paginated history         | Structured periods, plan management, charge reassignment/date correction and multi-charge allocation |
| Dashboards/settings   | Database statistics, role-specific data, child calendar links, club branding and settings                                                   | Complete team/activity/child summaries; apply configured defaults consistently                       |
| Validation/deployment | 75 local tests, typecheck/lint/build; setup/deployment/backup guidance                                                                      | Live role E2E, new UI/accessibility/performance/security acceptance, restore rehearsal; not deployed |

External verification blockers remain recorded in [PROGRESS.md](PROGRESS.md). Online payments and complex chat are explicitly outside the initial requirements.

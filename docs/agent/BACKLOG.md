# BACKLOG — Retail Game Platform

> Use this document as the development guide.
> Implement features in priority order: 🔴 Essential first, then 🟠 Important, then 🟡 Desirable.
> Each User Story maps directly to one or more API endpoints or WebSocket events defined in ARCHITECTURE.md.

---

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| RF-01 | User registration and authentication with email/password | 🔴 Essential |
| RF-02 | Role differentiation: FACILITATOR and PLAYER | 🔴 Essential |
| RF-03 | Facilitator creates game sessions with configurable parameters | 🔴 Essential |
| RF-04 | Facilitator creates up to 4 stores per session and generates access codes | 🔴 Essential |
| RF-05 | Facilitator starts, advances and ends rounds | 🔴 Essential |
| RF-06 | Player joins session via code and selects role | 🔴 Essential |
| RF-07 | Each store has exactly 5 roles: STORE_MANAGER, SUPPLY_MANAGER, COMMERCIAL_MANAGER, OPERATIONAL_MANAGER, SERVICE_MANAGER | 🔴 Essential |
| RF-08 | Each role has access only to their area's decisions in the PO | 🟠 Important |
| RF-09 | Real-time collaborative PO filling via WebSocket | 🔴 Essential |
| RF-10 | Real-time cash balance calculation during PO filling | 🔴 Essential |
| RF-11 | Real-time projected EBITDA during PO filling | 🔴 Essential |
| RF-12 | Alert and interest (12%/month) when cash exceeds R$700k | 🔴 Essential |
| RF-13 | Store manager confirms PO to unlock round | 🔴 Essential |
| RF-14 | Engine calculates CSAT from operators + quiz score | 🔴 Essential |
| RF-15 | Engine distributes demand based on Price, Availability and CSAT ranking (1-4) | 🔴 Essential |
| RF-16 | Engine calculates Breakage and Aging on unsold stock per category | 🔴 Essential |
| RF-17 | Engine calculates final EBITDA per store per round | 🔴 Essential |
| RF-18 | Engine applies SLA events for unimplemented CAPEXs | 🔴 Essential |
| RF-19 | Display store ranking by % EBITDA after each round | 🔴 Essential |
| RF-20 | Display full PO breakdown at end of session | 🔴 Essential |
| RF-21 | Facilitator moves up to 2 players between stores after round 1 | 🔴 Essential |
| RF-22 | Reconfiguration with cash constraints (no sales revenue reuse) | 🔴 Essential |
| RF-23 | Pricing scenario simulator before confirming PO | 🟡 Desirable |
| RF-24 | Configurable random event probabilities | 🟡 Desirable |
| RF-25 | Alerts for high aging or critical cash level | 🟡 Desirable |
| RF-26 | Export results to PDF or Excel | 🟡 Desirable |
| RF-27 | Session history for facilitator | 🟡 Desirable |

---

## Non-Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| RNF-01 | WebSocket updates max latency: 500ms | 🔴 Essential |
| RNF-02 | Support 20 concurrent users per session (4 stores × 5 players) | 🔴 Essential |
| RNF-03 | Passwords stored with bcrypt (cost=10 minimum) | 🔴 Essential |
| RNF-04 | JWT expiry 1h, refresh token 7 days | 🔴 Essential |
| RNF-05 | Responsive UI for tablets and desktops | 🟠 Important |
| RNF-06 | REST API response time < 300ms under normal load | 🟠 Important |
| RNF-07 | Automatic database backups via deploy provider | 🟠 Important |
| RNF-08 | Unit test coverage required for entire engine/ module | 🟠 Important |
| RNF-09 | Structured error logging (Pino or Winston) | 🟡 Desirable |
| RNF-10 | Automated CI/CD via GitHub Actions | 🟡 Desirable |

---

## Epics & User Stories

### Epic 1 — Authentication & User Management
| ID | User Story | Priority |
|---|---|---|
| US-01 | As a facilitator, I want to create an account to access the system | 🔴 MVP |
| US-02 | As a user, I want to log in with email and password | 🔴 MVP |
| US-03 | As a facilitator, I want to invite players via link/code | 🔴 MVP |
| US-04 | As a player, I want to join a session and choose my store role | 🔴 MVP |

### Epic 2 — Session Management
| ID | User Story | Priority |
|---|---|---|
| US-05 | As a facilitator, I want to create a session with initial parameters (cash, stock, demand) | 🔴 MVP |
| US-06 | As a facilitator, I want to create the 4 stores within a session | 🔴 MVP |
| US-07 | As a facilitator, I want to start and advance rounds | 🔴 MVP |
| US-08 | As a facilitator, I want to see all stores status in real time | 🔴 MVP |
| US-09 | As a facilitator, I want to end the session and show final ranking | 🔴 MVP |

### Epic 3 — Operational Plan (PO)
| ID | User Story | Priority |
|---|---|---|
| US-10 | As supply manager, I want to define stock purchased per category | 🔴 MVP |
| US-11 | As commercial manager, I want to define pricing margin per category | 🔴 MVP |
| US-12 | As operational manager, I want to define number of cashier and service operators | 🔴 MVP |
| US-13 | As service manager, I want to select which CAPEXs to implement | 🔴 MVP |
| US-14 | As store manager, I want to see available cash updated in real time | 🔴 MVP |
| US-15 | As store manager, I want to see projected EBITDA in real time | 🔴 MVP |
| US-16 | As store manager, I want to confirm the configuration to unlock the round | 🔴 MVP |

### Epic 4 — Calculation Engine & Rounds
| ID | User Story | Priority |
|---|---|---|
| US-17 | System must calculate CSAT from operators and quiz | 🔴 MVP |
| US-18 | System must distribute demand between stores based on Price, Availability and CSAT | 🔴 MVP |
| US-19 | System must calculate Breakage and Aging on unsold stock | 🔴 MVP |
| US-20 | System must calculate taxes, payroll, maintenance and licenses for EBITDA | 🔴 MVP |
| US-21 | System must apply SLA events for unimplemented CAPEXs | 🔴 MVP |
| US-22 | System must process player transfer between stores (max 2 per store) | 🔴 MVP |

### Epic 5 — Results & Ranking
| ID | User Story | Priority |
|---|---|---|
| US-23 | As a player, I want to see my store's partial results after each round | 🔴 MVP |
| US-24 | As a player, I want to see comparative ranking of all stores by % EBITDA | 🔴 MVP |
| US-25 | As a facilitator, I want to see full PO breakdown per store at the end | 🔴 MVP |

### Epic 6 — Differentiators (Post-MVP)
| ID | User Story | Priority |
|---|---|---|
| US-26 | As store manager, I want to simulate pricing scenarios before confirming PO | 🟡 Differentiator |
| US-27 | As facilitator, I want to configure random event probabilities | 🟡 Differentiator |
| US-28 | As player, I want alerts for high aging or critical cash | 🟡 Differentiator |
| US-29 | As facilitator, I want to export final results to PDF/Excel | 🟡 Differentiator |
| US-30 | As facilitator, I want to access previous session history | 🟡 Differentiator |

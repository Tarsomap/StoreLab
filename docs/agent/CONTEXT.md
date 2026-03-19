# PROJECT CONTEXT — Retail Game Platform

> This file gives you the full context to understand the domain before implementing anything.
> Read this first. Then read ARCHITECTURE.md. Then read BACKLOG.md.

---

## What is this project?

A gamified web platform that simulates retail store management. It is used in corporate training and academic settings. Participants are divided into teams of 5, each team manages a virtual store, and they compete across 3 rounds to maximize their store's EBITDA percentage.

This is NOT a traditional CRUD management system. It is a **real-time multiplayer game** with:
- A collaborative form (Operational Plan) that multiple users fill simultaneously
- A calculation engine that processes complex business rules
- A game state machine that controls round progression
- Real-time updates via WebSocket for all participants

---

## The Game Flow

```
1. FACILITATOR creates a session and configures parameters
2. FACILITATOR creates 4 stores and shares access codes
3. PLAYERS join stores and pick roles (5 roles per store)
4. Each store fills the Operational Plan (PO) collaboratively
5. FACILITATOR triggers Round 1
6. ENGINE distributes demand and calculates EBITDA for each store
7. Results shown in real-time ranking
8. Reconfiguration phase: player transfers + plan adjustments
9. Rounds 2 and 3 follow the same flow
10. Final ranking determines winner (highest % EBITDA)
```

---

## The Operational Plan (PO) — Core of the Game

Each store fills one PO per round. The PO has these decision areas:

| Decision Area | Role Responsible | What they decide |
|---|---|---|
| Stock Purchase | SUPPLY_MANAGER | How much stock to buy per category (R$) |
| Pricing | COMMERCIAL_MANAGER | Margin % per category |
| Workforce | OPERATIONAL_MANAGER | Number of cashier operators (affects CSAT) |
| Services | SERVICE_MANAGER | Number of service operators (affects SLA) |
| CAPEX | SERVICE_MANAGER | Which investments to implement (affects risk/cost) |

**Categories:** PERECIVEIS, MERCEARIA, ELETRO, HIPEL
**Each has:** unit_cost, tax_rate, breakage_rate, aging_rate

---

## CAPEX Options (6 types)

| Type | Risk if NOT implemented |
|---|---|
| SECURITY | Cyber attack → store offline for N days |
| FREEZER | Equipment failure → no PERECIVEIS sales for N days |
| NETWORK | Network outage → store offline for N days |
| SITE | Site slowdown → no online sales for N days |
| SELF_CHECKOUT | Peak demand → lost sales for N days |
| AUTOMATION | Reduced operational capacity, limits growth |

---

## Key Business Rules (implement exactly as described)

**Cash limit:** R$700,000 initial. If exceeded, 12%/month interest on excess.

**CSAT formula:**
```
CSAT = (cashier_operators / 10) × quiz_correct_percentage
```

**Demand distribution:**
```
Rank stores 1-4 on each of: Basket Price (lower=better), Availability (higher=better), CSAT (higher=better)
Demand share = store_total_points / all_stores_total_points
```

**EBITDA formula:**
```
Gross Revenue - Taxes - COGS - Breakage - Aging - Payroll - Maintenance - Licenses - Interest - SLA losses
```

**Reconfiguration (after round 1):**
- Only unused cash from initial budget
- Can use unspent CAPEX budget
- CANNOT use sales revenue
- CANNOT move stock between categories
- Max 2 player transfers per store

---

## Naming Conventions

```
Backend:  camelCase variables, PascalCase classes, kebab-case files
Frontend: PascalCase components, camelCase hooks/utils
Database: snake_case columns, PascalCase model names (Prisma convention)
API:      kebab-case routes, camelCase JSON fields
Envs:     SCREAMING_SNAKE_CASE
```

---

## What to avoid

- Do NOT mention the partner company name anywhere in the codebase, comments, or docs
- Do NOT hardcode business rule values — use constants or seed data
- Do NOT calculate EBITDA on-the-fly from historical data — always use persisted RoundResult
- Do NOT allow players to access other stores' PO data during active rounds
- Do NOT skip input validation on any PO decision (negative stock, margins > 100%, etc.)

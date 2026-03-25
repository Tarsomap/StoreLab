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
1. FACILITATOR creates a session and configures real parameters:
   - initial_cash (default R$700k, but configurable)
   - available_stock per category (max units teams can buy)
   - expected_demand per category (total customers to be distributed)
2. FACILITATOR creates 4 stores and shares access codes
3. PLAYERS join stores and pick roles (5 roles per store)
4. Each store fills the Operational Plan (PO) collaboratively with real decisions
5. FACILITATOR triggers Round 1
6. ENGINE distributes demand and calculates EBITDA for each store
7. Results shown in real-time ranking
8. Reconfiguration phase: player transfers (MANDATORY: 1–2 per store) + plan adjustments
9. Rounds 2 and 3 follow the same flow
10. Final ranking determines winner (highest % EBITDA)
```

---

## The Operational Plan (PO) — Core of the Game

Each store fills one PO per round. The PO has these decision areas:

| Decision Area | Role Responsible | What they decide | Input type |
|---|---|---|---|
| Stock Purchase | SUPPLY_MANAGER | How many units to buy per category | Integer (units) |
| Pricing | COMMERCIAL_MANAGER | Margin % per category | Float (0–80%) |
| Workforce | OPERATIONAL_MANAGER | Number of cashier operators | Integer (0–10) |
| Workforce | OPERATIONAL_MANAGER | Number of service operators | Integer (0–5) |
| CAPEX | SERVICE_MANAGER | Which investments to implement | Boolean per CAPEX |

> ⚠️ **Important:** the values entered by players are REAL decisions made in the moment — not simulated or pre-filled. The system only provides the seed constants (unit costs, tax rates, etc.) as a fixed base for calculations.

**Categories:** PERECIVEIS, MERCEARIA, ELETRO, HIPEL

**Seed constants per category (fixed, loaded from DB seed):**

| Category | Unit Cost | Tax Rate | Breakage | Aging |
|---|---|---|---|---|
| PERECIVEIS | R$ 8.00 | 9.25% | 3.0% | 2.0% |
| MERCEARIA | R$ 5.00 | 7.65% | 1.0% | 0.0% |
| ELETRO | R$ 120.00 | 12.50% | 0.2% | 5.0% |
| HIPEL | R$ 45.00 | 7.65% | 0.5% | 1.0% |

> ⚠️ **Breakage and Aging** are calculated **only once at the end of the last round**, applied to the total unsold stock accumulated across all rounds — NOT per round.

---

## Session Parameters (set by Facilitator at session creation)

These are real values the Facilitator inputs when creating a session — they define the game scenario:

| Parameter | Default | Description |
|---|---|---|
| `initial_cash` | R$ 700,000 | Starting budget for each store |
| `available_stock` per category | Configurable | Max units each store can purchase |
| `expected_demand` per category | Configurable | Total customers to be distributed among stores |

---

## CAPEX Options (6 types)

> ⚠️ The exact acquisition costs per CAPEX are defined in the official rules document (image table).
> The values below for Monthly License are derived from the official rules text and must be confirmed against the CAPEX summary table image before implementation.

| Type | Monthly License Impact | SLA Risk if NOT implemented | Notes |
|---|---|---|---|
| SECURITY | Base R$500 + 20% = +R$100/month | 15% chance → revenue loss proportional to downtime days | Cybersecurity monitoring |
| FREEZER | Eliminates R$400/month maintenance fee | 10% chance → Perecíveis cannot be sold for N days | Equipment replacement |
| NETWORK | No license change | 5% chance → store offline for N days | Network migration |
| SITE | Base R$500 + 30% = +R$150/month | No SLA risk (branding/speed only) | Platform migration |
| SELF_CHECKOUT | +R$80/month per unit × 4 units = +R$320/month | No SLA risk (speed improvement) | 4 self-checkout units |
| AUTOMATION | No license change | No SLA risk (labor productivity) | Reports & process automation |

> 📌 **Pending:** exact acquisition costs per CAPEX are in an image in the official rules (.docx). These must be confirmed with the business partner before seeding.

---

## Key Business Rules (implement exactly as described)

**Cash limit:** R$700,000 initial (configurable by Facilitator). If exceeded, **12%/month** interest on the excess amount.

**CSAT formula:**
```
CSAT = (cashier_operators / 10) × quiz_correct_percentage
```

**Demand distribution:**
```
Rank stores 1-4 on each of: Basket Price (lower=better), Availability (higher=better), CSAT (higher=better)
Demand share = store_total_points / all_stores_total_points
Absolute demand = demand_share × session_expected_demand (set by Facilitator)
```

**EBITDA formula:**
```
Gross Revenue - Taxes - COGS - Breakage - Aging - Payroll - Maintenance - Licenses - Interest - SLA losses
```

**Fixed costs (seed constants):**
```
Cashier operator salary:  R$ 1,000/month per operator
Service operator salary:  R$ 1,200/month per operator
Maintenance (Freezer):    R$ 400/month — charged ONLY if CAPEX FREEZER is NOT implemented
Excess cash interest:     12% per month on cash > R$700k
Software base license:    R$ 500/month (base, before CAPEX impacts)
```

**SLA — Service Operators:**
The SLA for internal services is based on the number of service operators contracted.
The more service operators, the faster issues are resolved — directly impacting downtime days when a CAPEX-related SLA event occurs.
> 📌 **Pending:** the exact SLA table (days of resolution per number of service operators) is in an image in the official rules (.docx) and must be confirmed before implementation.

**Player transfers (Reconfiguration after Round 1):**
- **MANDATORY:** each store MUST make 1 to 2 player transfers with other stores
- Only unused cash from initial budget can be used
- Can use unspent CAPEX budget value
- CANNOT use sales revenue
- CANNOT move stock between categories

**Breakage and Aging timing:**
- Calculated **once at the end of the last round** on total unsold stock accumulated
- NOT applied per round

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
- Do NOT assume stock input is in R$ — it is always in **units (quantity)**
- Do NOT apply Breakage/Aging per round — apply only at the end of the last round on total unsold stock
- Do NOT make player transfers optional — they are MANDATORY (1–2 per store) after round 1

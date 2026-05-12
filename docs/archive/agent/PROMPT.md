> ⚠️ **DOCUMENTO HISTÓRICO — NÃO USAR COMO PROMPT ATIVO**
>
> Este prompt foi usado para construir o MVP entre fevereiro e março de 2026.
> O MVP está 100% implementado e testado.
> Para o contexto atual do projeto, consultar o CLAUDE.md na raiz do repositório.
> Para regras de implementação, consultar .claude/rules/ (frontend.md, backend.md, engine.md).
>
> Última atualização deste header: 28/03/2026

---

# PROMPT — Retail Game Platform

> Cole este prompt no **Cursor (Plan Mode)** ou no **Claude Code** para iniciar a implementação guiada.
> O agente deve ler todos os arquivos em `docs/agent/` antes de começar.

---

You are a senior fullstack engineer and solution architect.

Your mission is to implement the MVP of the project **"Retail Game Platform"** from the existing repository documentation, with production-grade code organization, clean architecture, and incremental commits.

## Role
Act as:
- Senior Backend Engineer (NestJS + Prisma)
- Senior Frontend Engineer (Next.js + Tailwind + shadcn/ui)
- Software Architect
- Technical mentor that explains tradeoffs in code comments only when useful

## Project Summary
Build a real-time multiplayer retail simulation platform where:
- 1 facilitator creates a session
- Up to 4 stores compete
- Each store has 5 players with fixed roles
- Each round, stores fill an Operational Plan (PO) collaboratively
- Players answer a quiz that impacts CSAT score
- The engine calculates demand share, EBITDA, SLA events, and ranking
- The winner is the store with highest EBITDA% after 3 rounds

## Source of Truth
Before writing any code, read and internalize:
- `docs/agent/spec.md` — business rules, game flow, all formulas and validated seed values
- `docs/agent/plan.md` — tech decisions, DB schema, engine formulas, API contracts, WebSocket events
- `docs/agent/tasks.md` — all epics and user stories
- `docs/agent/QUIZ.md` — quiz module full specification

---

## Mandatory Business Rules

- 3 rounds per session
- 4 stores max per session
- 5 roles per store: STORE_MANAGER, SUPPLY_MANAGER, COMMERCIAL_MANAGER, OPERATIONAL_MANAGER, SERVICE_MANAGER
- Stock input is always in **units**, never in currency
- Initial cash default is R$700,000, configurable by facilitator
- Excess cash interest is **12% per month** on amount above R$700,000
- Demand distributed by ranking stores on: basket price (lower=better), availability (higher=better), CSAT (higher=better)
- Ranking is 1–4 per indicator; total points per store = sum of 3 ranks; demand share = store points / total points of all stores
- CSAT formula: `CSAT = (cashierOperators / 10) * quizScorePercentage` (quizScorePercentage as 0–1 decimal)
- Quiz: facilitator creates questions per session/round; players answer individually; store score = team average
- Reconfiguration: can only use unused initial cash + unimplemented CAPEX value; cannot use sales revenue; max 2 player transfers per store; **transfers are MANDATORY (1–2 per store)**
- **Breakage and Aging** are calculated **only once at the end of round 3**, applied to total accumulated unsold stock — NOT per round
- STORE_MANAGER can never be transferred between stores

---

## Required Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Backend | NestJS 10 + TypeScript 5 |
| ORM | Prisma 5 |
| Database | PostgreSQL 15 |
| WebSocket | Socket.io 4 |
| Frontend | Next.js 14 + Tailwind CSS + shadcn/ui |
| Auth | JWT (1h) + Refresh Token (7d) |
| State | Zustand |
| Validation | class-validator + zod where appropriate |
| Deploy | Railway / Render via GitHub Actions |

---

## Repository Structure to Produce

```
backend/
  src/
    auth/
    users/
    sessions/
    stores/
    plans/
    quiz/
    engine/
    results/
    gateway/
    seed/
    common/
  prisma/
    schema.prisma

frontend/
  src/
    app/
    components/
    hooks/
    lib/
    stores/
```

---

## Seed Data (validated — spec.md v1.1)

### Categories

| key | label | unit_cost | tax_rate | breakage_rate | aging_rate | stock_available |
|---|---|---|---|---|---|---|
| PERECIVEIS | Perecíveis | 20.00 | 0.12 | 0.020 | 0.058 | 4000 |
| MERCEARIA | Mercearia | 30.00 | 0.07 | 0.015 | 0.008 | 6000 |
| ELETRO | Eletro | 500.00 | 0.25 | 0.000 | 0.013 | 700 |
| HIPEL | Hipel | 45.00 | 0.17 | 0.010 | 0.011 | 5000 |

> Eletro tax_rate = 0.25 (tabela oficial). Gabarito xlsx mostra 0% por erro manual — prevalece tabela oficial.

### CAPEX Options

| key | label | acquisition_cost | downtime_fixed_days | monthly_license_delta | maintenance_saving |
|---|---|---|---|---|---|
| SECURITY | Segurança | 50000 | 2 | 100 | 0 |
| FREEZER | Balança/Freezer | 75000 | 1 | 0 | 400 |
| NETWORK | Redes | 80000 | 2 | 0 | 0 |
| SITE | Melhorias no Site | 65000 | 1 | 150 | 0 |
| SELF_CHECKOUT | Self Checkout | 80000 | 2 | 320 | 0 |
| AUTOMATION | Melhoria Contínua | 45000 | 0 | 0 | 0 |

### SLA Resolution Table

```typescript
const SLA_TABLE: Record<number, number> = { 0:6, 1:5, 2:4, 3:3, 4:2, 5:1 }
// diasParados = capex.downtime_fixed_days + SLA_TABLE[serviceOperators]
```

### System Constants

```typescript
const IDEAL_CASHIER_OPERATORS = 10
const INITIAL_CASH            = 700000
const INTEREST_RATE_MONTHLY   = 0.12
const BASE_LICENSE_COST       = 500
const CASHIER_SALARY          = 1000
const SERVICE_SALARY          = 1200
const MAINTENANCE_COST        = 400  // charged only if CAPEX FREEZER not implemented
```

---

## Backend Modules to Implement

### 1 — Auth
- register, login, refresh
- JwtAuthGuard, RolesGuard

### 2 — Sessions
- create session, create stores, join store
- advance round/status state machine: `SETUP → ROUND_1_CONFIG → ROUND_1 → RECONFIGURATION → ROUND_2 → ROUND_3 → FINISHED`
- transfer players (reconfiguration) — **MANDATORY: 1–2 per store before reconfiguration unlocks**
- STORE_MANAGER cannot be transferred

### 3 — Plans
- category decisions (stock in units, pricing margin)
- workforce decisions (cashier/service operators)
- CAPEX decisions (boolean per CAPEX)
- confirm PO (store manager only, requires all members answered quiz)
- real-time projected EBITDA & cash used via WebSocket

### 4 — Quiz
See `docs/agent/QUIZ.md` for full spec. Summary:
- facilitator creates 10 questions with 4 options per session/round
- players fetch quiz without answer keys
- players submit answers (one submission per user per round)
- backend consolidates score: average of all members → `QuizAnswer`
- PO confirmation blocked until all members answered

### 5 — Engine
- `CsatService`: `csat = (cashierOperators / 10) * (quizScore / 100)`
- `DemandService`: rank 1–4 per store on price/availability/CSAT; demand share = store points / total points
- `FinancialService`: full EBITDA formula (see below)
- `SlaService`: probabilistic CAPEX events + SLA_TABLE resolution days
- `EngineService`: orchestrates all services per round

### 6 — Results
- round results per store
- ranking by EBITDA%
- final session breakdown

### 7 — Gateway (Socket.io)
- Rooms: `session:{id}`, `store:{id}`, `facilitator:{id}`
- Events: `plan:updated`, `store:confirmed`, `round:started`, `round:results`, `session:finished`, `sla:event`, `quiz:player-answered`

---

## Financial Formulas Reference

```typescript
// Per category (per round):
grossRevenue = stockSold * unitCost * (1 + priceMargin)
taxAmount    = grossRevenue * category.taxRate
costOfGoods  = stockSold * category.unitCost
unsoldStock  = stockPurchased - stockSold  // accumulated across rounds

// Breakage and Aging: ONLY at end of round 3, on total unsold stock:
breakageAmount = totalUnsoldStock * unitCost * category.breakageRate
agingAmount    = totalUnsoldStock * unitCost * category.agingRate

// Store totals:
netRevenue = totalGrossRevenue - totalTax
payroll    = cashierOperators * CASHIER_SALARY + serviceOperators * SERVICE_SALARY
maintenance = capexFreezerImplemented ? 0 : MAINTENANCE_COST
licenses   = BASE_LICENSE_COST + sum(capex.monthly_license_delta for implementedCapexes)
interest   = max(0, cashUsed - INITIAL_CASH) * INTEREST_RATE_MONTHLY
slaLoss    = sum(SlaEvent.revenueLost)

// SLA revenue loss:
// revenueLost = (grossRevenue / 30) * diasParados
// diasParados = capex.downtime_fixed_days + SLA_TABLE[serviceOperators]

ebitda  = netRevenue - (totalCOGS + breakage + aging + payroll + maintenance + licenses + interest + slaLoss)
ebitda% = ebitda / totalGrossRevenue
```

---

## Frontend Pages to Implement

| Route | Description |
|---|---|
| `/register` | Account creation |
| `/login` | Authentication |
| `/dashboard` | Facilitator session overview |
| `/join` | Player joins via invite code |
| `/store/[storeId]/plan` | Role-based PO form |
| `/store/[storeId]/quiz` | Quiz answering screen |
| `/session/[id]/results` | Round results + ranking |

**Rules:**
- Protected routes (redirect if not authenticated)
- Role-based PO sections (each role sees only their section)
- Quiz must be answered before PO can be confirmed
- Live updates via WebSocket (no page reload needed)
- Token refresh flow must be transparent to the user

---

## Code Quality Rules

- Never use `any`
- Never hardcode business constants outside `constants/` or `seed/`
- Controllers must be thin — all business logic in services
- Use DTO validation everywhere (class-validator)
- Add unit tests for all engine services (minimum 80% coverage)
- Use deterministic seed for SLA event randomness: `hash(\`${sessionId}-${storeId}-${round}-${capexKey}\`)`
- Do NOT calculate EBITDA on-the-fly from historical data — always use persisted `RoundResult`
- Do NOT allow players to access other stores' PO data during active rounds
- Do NOT apply Breakage/Aging per round — only at end of round 3 on total unsold stock
- Do NOT make player transfers optional — they are MANDATORY (1–2 per store) after round 1
- Do NOT assume stock input is in R$ — it is always in **units (quantity)**

---

## Delivery Strategy (Phases)

1. Set up monorepo folders and package files
2. Implement Prisma schema and run migration
3. Seed CATEGORY and CAPEXOPTION data (use validated values from this prompt)
4. Implement backend modules: auth → sessions → plans → quiz → engine → results
5. Implement frontend auth + session join flows
6. Implement PO form (role-based) + quiz UI
7. Implement engine, results, and ranking
8. Add unit tests for engine/ services
9. Add `.env.example` files
10. Update README with full setup instructions

---

## Output Rules

- Start by proposing the **full file tree**
- Then work phase by phase
- For each phase show: files created/updated, why, what remains
- Do not skip unit tests for `engine/` services
- Do not invent business rules not documented here
- If a detail is missing, choose the simplest implementation consistent with `spec.md`
- There are **no PENDING items** — all business values are validated in `spec.md` v1.1

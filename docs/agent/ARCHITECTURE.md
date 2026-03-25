# ARCHITECTURE — Retail Game Platform

> Este documento é a fonte da verdade técnica do projeto.
> Ao implementar qualquer feature, siga rigorosamente as decisões aqui documentadas.
> Em caso de conflito entre este documento e qualquer outro, este prevalece.

---

## Project Overview

A multiplayer web platform for retail store management simulation. Teams of 5 players compete across 3 rounds, making operational decisions (inventory, pricing, workforce, CAPEX) with real-time financial impact visualization. The system automatically calculates EBITDA based on business rules defined by the game.

**Core challenge:** Real-time collaborative form filling + complex financial calculation engine + WebSocket-driven game state machine.

---

## Tech Stack

```
Runtime:     Node.js 20 LTS
Backend:     NestJS 10 + TypeScript 5
ORM:         Prisma 5
Database:    PostgreSQL 15
WebSocket:   Socket.io 4
Frontend:    Next.js 14 + Tailwind CSS + shadcn/ui
Auth:        JWT (1h) + Refresh Token (7d) + bcrypt
Deploy:      Railway or Render (via GitHub Actions)
```

---

## Project Structure

```
retail-game-platform/
├── backend/
│   ├── src/
│   │   ├── auth/           # JWT auth, guards, decorators
│   │   ├── users/          # User CRUD
│   │   ├── sessions/       # Session lifecycle & state machine
│   │   ├── stores/         # Store & member management
│   │   ├── plans/          # Operational Plan (PO) decisions
│   │   ├── quiz/           # Quiz questions, player answers, consolidation
│   │   ├── engine/         # Core calculation engine
│   │   │   ├── csat.service.ts
│   │   │   ├── demand.service.ts
│   │   │   ├── financial.service.ts
│   │   │   └── sla.service.ts
│   │   ├── results/        # Round results & ranking
│   │   ├── gateway/        # Socket.io gateway
│   │   ├── seed/           # Categories & CAPEX options seed data
│   │   └── common/         # Shared guards, pipes, DTOs
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
└── frontend/
    ├── src/
    │   ├── app/             # Next.js App Router
    │   ├── components/      # UI components (shadcn/ui based)
    │   ├── hooks/           # Custom React hooks (useSocket, usePlan, etc.)
    │   ├── lib/             # API client, socket client, utils
    │   └── stores/          # Zustand global state
    └── package.json
```

---

## Database Schema (Prisma)

Full schema is in `backend/prisma/schema.prisma`. Key relationships:

```
User (FACILITATOR | PLAYER)
  └── Session (via facilitatorId)
        ├── SessionCategoryConfig[] → Category (seed)
        └── Store[]
              ├── StoreMember[] → User
              ├── OperationalPlan[]
              │     ├── PoCategoryDecision[] → Category
              │     └── PoCapexDecision[] → CapexOption (seed)
              ├── QuizAnswer[]
              └── RoundResult[]

Session
  ├── RoundResult[]
  ├── SlaEvent[]
  └── PlayerTransfer[]
```

**Seed data required (run before first use):**
- 4 Categories: PERECIVEIS, MERCEARIA, ELETRO, HIPEL (with unit_cost, tax_rate, breakage_rate, aging_rate)
- 6 CapexOptions: SECURITY, FREEZER, NETWORK, SITE, SELF_CHECKOUT, AUTOMATION
  - Exact acquisition costs are in the official rules image table — confirm before seeding
  - Monthly license deltas derived from rules text (see Business Rules section below)

---

## Game State Machine

Session progresses through these states in order:

```
SETUP → ROUND_1 → RECONFIGURATION → ROUND_2 → ROUND_3 → FINISHED
```

**Transitions:**
- `SETUP → ROUND_1`: All 4 stores have confirmed their OperationalPlan (round=1, config=1)
- `ROUND_1 → RECONFIGURATION`: Engine finishes processing round 1 results
- `RECONFIGURATION → ROUND_2`: All stores confirm OperationalPlan (round=2, config=2) after MANDATORY player transfers
- `ROUND_2 → ROUND_3`: Engine finishes processing round 2
- `ROUND_3 → FINISHED`: Engine finishes processing round 3

Facilitator manually triggers each transition via API.

> ⚠️ **Player transfers are MANDATORY** after round 1: each store must transfer 1–2 players with other stores before reconfiguration is unlocked.

---

## Calculation Engine — Business Rules

### CSAT
```typescript
csat = (cashierOperators / IDEAL_OPERATORS) * quizScorePercentage
// IDEAL_OPERATORS = 10 (system constant)
// quizScorePercentage = correctAnswers / totalQuestions (0 to 1)
```

### Demand Distribution
```typescript
// Each indicator ranked 1-4 across stores (4 = best)
// Basket Price: LOWER is better (invert ranking)
// Availability: HIGHER is better
// CSAT: HIGHER is better

storeScore = priceRank + availabilityRank + csatRank  // max 12
demandShare = storeScore / totalScoreAllStores
stockSold = availableStock * demandShare
```

### Financial Calculation (per store per round)
```typescript
// Per category:
grossRevenue      = stockSold * (unitCost * (1 + priceMargin))
taxAmount         = grossRevenue * category.taxRate
costOfGoods       = stockSold * category.unitCost
unsoldStock       = stockPurchased - stockSold

// Breakage and Aging: applied ONLY at the end of the LAST round
// on total accumulated unsold stock across all rounds — NOT per round
breakageAmount    = totalUnsoldStock * unitCost * category.breakageRate  // end of round 3 only
agingAmount       = totalUnsoldStock * unitCost * category.agingRate     // end of round 3 only

// Store totals:
totalGrossRevenue = sum(grossRevenue per category)
totalTax          = sum(taxAmount per category)
totalCOGS         = sum(costOfGoods per category)

// Fixed costs:
// Cashier: R$1,000/month per operator
// Service: R$1,200/month per operator
payrollCost       = cashierOperators * 1000 + serviceOperators * 1200

// Maintenance: R$400/month — charged ONLY if CAPEX FREEZER is NOT implemented
maintenanceCost   = isCapexFreezerImplemented ? 0 : 400

// Software license: base R$500/month + increments from implemented CAPEXs
// SECURITY: +R$100 (base R$500 × 20%)
// SITE:     +R$150 (base R$500 × 30%)
// SELF_CHECKOUT: +R$320 (R$80 × 4 units)
// Other CAPEXs: no license change
licenseCost       = BASE_LICENSE + sum(capex.monthlyLicenseDelta for implemented CAPEXs)
// BASE_LICENSE = 500 (system constant)

// Interest: 12%/month on cash used above R$700k
interestCost      = cashUsed > 700000 ? (cashUsed - 700000) * 0.12 : 0

slaRevenueLost    = sum(SlaEvent.revenueLost for this store/round)

// Final:
netRevenue        = totalGrossRevenue - totalTax
totalCosts        = totalCOGS + breakageAmount + agingAmount + payrollCost
                    + maintenanceCost + licenseCost + interestCost + slaRevenueLost
ebitda            = netRevenue - totalCosts
ebitdaPercentage  = ebitda / totalGrossRevenue
```

### SLA Events — Two types

#### Type 1: CAPEX-based SLA (random events)
```typescript
// For each unimplemented CAPEX with slaRisk > 0, roll probability of failure
// If failure occurs: revenue lost proportional to downtime days
// Register SlaEvent and subtract from EBITDA
// Use deterministic hash: hash(`${sessionId}-${storeId}-${round}-${capexType}`)
```

| CAPEX not implemented | Risk | Impact |
|---|---|---|
| SECURITY | 15% | Revenue lost for N downtime days |
| FREEZER | 10% | Perecíveis unsellable for N days |
| NETWORK | 5% | Store offline for N downtime days |

#### Type 2: Service Operator SLA (resolution time)
```typescript
// The number of service operators directly affects how quickly SLA events are resolved
// Fewer operators = more days of downtime when an event occurs
// The resolution days table per number of operators is defined in the official rules (.docx)
// ⚠️ PENDING: exact table values must be confirmed from the official rules image before implementation
```

### Reconfiguration Constraints
```typescript
// MANDATORY: 1-2 player transfers per store before reconfiguration unlocks
// ALLOWED:
availableCash = initialCash - cashUsedInConfig1 + unimplementedCapexValue
// NOT ALLOWED: use revenue from completed sales
// NOT ALLOWED: transfer stock between categories
```

---

## WebSocket Events

### Rooms
- `session:{sessionId}` — all participants of a session
- `store:{storeId}` — all members of a specific store
- `facilitator:{sessionId}` — facilitator only

### Events (Server → Client)
```
plan:updated          → { plan }           emitted to store room on any PO change
store:confirmed       → { storeId }        emitted to facilitator when store confirms
round:started         → { round }          emitted to session room
round:results         → { results[] }      emitted to session room after engine runs
session:finished      → { finalResults[] } emitted to session room
sla:event             → { slaEvent }       emitted to store room when SLA event occurs
quiz:player-answered  → { userId, storeId, round, answered, total } emitted to store room
```

### Events (Client → Server)
```
join:session          → { sessionId, userId }
join:store            → { storeId, userId }
plan:decision         → { planId, field, value }
```

---

## API Contracts (REST)

### Auth
```
POST /auth/register     → { name, email, password }
POST /auth/login        → { email, password } → { accessToken, refreshToken }
POST /auth/refresh      → { refreshToken } → { accessToken }
```

### Sessions
```
POST   /sessions                    → create session
GET    /sessions/:id                → get session details
PATCH  /sessions/:id/advance        → advance to next state (facilitator only)
GET    /sessions/:id/status         → get all stores status
```

### Stores
```
POST   /sessions/:id/stores         → create store
POST   /stores/:id/join             → join store with role
PATCH  /stores/:id/transfer         → transfer players (facilitator, mandatory after round 1)
```

### Plans
```
GET    /plans/:storeId/:round       → get current plan
PATCH  /plans/:id/category          → update category decision
PATCH  /plans/:id/capex             → update capex decision
PATCH  /plans/:id/workforce         → update workforce decision
POST   /plans/:id/confirm           → confirm plan (store manager only, requires quiz answered)
```

### Quiz
```
POST   /sessions/:sessionId/quiz/questions        → create questions (facilitator)
GET    /sessions/:sessionId/quiz/questions        → list questions with answer key (facilitator)
GET    /stores/:storeId/quiz?round=N              → get quiz without answer key (player)
POST   /stores/:storeId/quiz/submit               → submit answers (player, once per round)
POST   /quiz/stores/:storeId/consolidate          → consolidate store score (internal/engine)
```

### Engine
```
POST   /engine/run-round            → trigger round calculation (facilitator only)
```

### Results
```
GET    /results/:sessionId          → all round results
GET    /results/:sessionId/ranking  → ranking by EBITDA%
```

---

## Non-Functional Requirements

```
Performance:  REST APIs < 300ms | WebSocket updates < 500ms latency
Security:     bcrypt cost=10 | JWT 1h | HTTPS in production
Scalability:  Support 20 concurrent users per session (4 stores × 5 players)
Testing:      Unit tests required for entire engine/ module (minimum 80% coverage)
Logging:      Structured logs with Pino or Winston
CI/CD:        GitHub Actions → auto deploy on push to main
```

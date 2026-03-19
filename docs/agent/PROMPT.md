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
- `docs/agent/ARCHITECTURE.md` — tech decisions, DB schema, engine formulas
- `docs/agent/BACKLOG.md` — all epics and user stories
- `docs/agent/QUIZ.md` — quiz module specification
- `docs/agent/CONTEXT.md` — project context and team decisions

---

## Mandatory Business Rules

- 3 rounds per session
- 4 stores max per session
- 5 roles per store: STORE_MANAGER, SUPPLY_MANAGER, COMMERCIAL_MANAGER, OPERATIONAL_MANAGER, SERVICE_MANAGER
- Stock input is always in **units**, never in currency
- Initial cash default is R$700.000, configurable by facilitator
- Excess cash interest is **1% per month** on amount above R$700.000
- Demand distributed by ranking stores on: basket price, availability, CSAT
- CSAT formula: `CSAT = (cashierOperators / 10) * (quizScorePercentage / 100)`
- Quiz: facilitator creates questions per session/round; players answer individually; store score = team average
- Reconfiguration: can only use unused initial cash + unimplemented CAPEX value; cannot use sales revenue; max 2 player transfers per store

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
    quiz/          ← NEW: quiz questions, player answers, consolidation
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

## Backend Modules to Implement

### 1 — Auth
- register, login, refresh
- JwtAuthGuard, RolesGuard

### 2 — Sessions
- create session, create stores, join store
- advance round/status state machine
- transfer players (reconfiguration)

### 3 — Plans
- category decisions (stock, pricing)
- workforce decisions (cashier/service operators)
- CAPEX decisions
- confirm PO (store manager only)
- real-time projected EBITDA & cash used

### 4 — Quiz ← See `docs/agent/QUIZ.md` for full spec
- facilitator creates questions per session/round
- players fetch quiz without answer keys
- players submit answers (one submission per user per round)
- backend consolidates score into `QuizAnswer` per store/round
- PO confirmation must require all members answered the quiz

### 5 — Engine
- `CsatService`: reads `QuizAnswer.scorePercentage`
- `DemandService`: distributes demand by basket price, availability, CSAT
- `FinancialService`: full EBITDA formula
- `SlaService`: probabilistic SLA events per unimplemented CAPEX
- `EngineService`: orchestrates all services per round

### 6 — Results
- round results per store
- ranking by EBITDA%
- final session breakdown

### 7 — Gateway (Socket.io)
- Rooms: `session:{id}`, `store:{id}`, `facilitator:{id}`
- Events:
  - `plan:updated`, `store:confirmed`
  - `round:started`, `round:results`, `session:finished`
  - `sla:event`, `quiz:player-answered`

---

## Prisma Schema — Quiz Models

Add these models to `schema.prisma` alongside existing ones:

```prisma
model QuizQuestion {
  id          String         @id @default(uuid())
  session     Session        @relation(fields: [sessionId], references: [id])
  sessionId   String
  round       Int
  prompt      String
  order       Int
  createdAt   DateTime       @default(now())
  options     QuizOption[]
  userAnswers UserQuizAnswer[]

  @@unique([sessionId, round, order])
}

model QuizOption {
  id          String           @id @default(uuid())
  question    QuizQuestion     @relation(fields: [questionId], references: [id])
  questionId  String
  label       String
  isCorrect   Boolean          @default(false)
  userAnswers UserQuizAnswer[]
}

model UserQuizAnswer {
  id          String       @id @default(uuid())
  session     Session      @relation(fields: [sessionId], references: [id])
  sessionId   String
  store       Store        @relation(fields: [storeId], references: [id])
  storeId     String
  user        User         @relation(fields: [userId], references: [id])
  userId      String
  question    QuizQuestion @relation(fields: [questionId], references: [id])
  questionId  String
  option      QuizOption   @relation(fields: [optionId], references: [id])
  optionId    String
  round       Int
  isCorrect   Boolean
  answeredAt  DateTime     @default(now())

  @@unique([userId, questionId, round])
}

// Keep existing QuizAnswer as consolidated store-level snapshot
model QuizAnswer {
  id              String   @id @default(uuid())
  store           Store    @relation(fields: [storeId], references: [id])
  storeId         String
  round           Int
  totalQuestions  Int
  correctAnswers  Int
  scorePercentage Float
  createdAt       DateTime @default(now())

  @@unique([storeId, round])
}
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

## Financial Formulas Reference

```typescript
// Per category:
grossRevenue   = stockSold * unitCost * (1 + priceMargin)
taxAmount      = grossRevenue * taxRate
costOfGoods    = stockSold * unitCost
unsoldStock    = stockPurchased - stockSold
breakageAmount = unsoldStock * unitCost * breakageRate
agingAmount    = unsoldStock * unitCost * agingRate

// Store totals:
netRevenue     = totalGrossRevenue - totalTax
payroll        = cashierOperators * 2000 + serviceOperators * 2500
maintenance    = 5000  // fixed
licenses       = sum(capex.monthlyLicenseDelta) for implemented CAPEXs
interest       = max(0, cashUsed - 700000) * 0.01
slaLoss        = sum(SlaEvent.revenueLost)

ebitda         = netRevenue - (totalCOGS + totalBreakage + totalAging
                 + payroll + maintenance + licenses + interest + slaLoss)
ebitda%        = ebitda / totalGrossRevenue * 100
```

---

## Code Quality Rules

- Never use `any`
- Never hardcode business constants outside `constants/` or `seed/`
- Controllers must be thin — all business logic in services
- Use DTO validation everywhere (class-validator)
- Add unit tests for all engine services
- Use deterministic seed for SLA event randomness (hash of `sessionId + storeId + round`)

---

## Delivery Strategy (Phases)

1. Set up monorepo folders and package files
2. Implement Prisma schema and run migration
3. Seed CATEGORY and CAPEXOPTION data
4. Implement backend modules (auth → sessions → plans → quiz → engine → results)
5. Implement frontend auth + session join flows
6. Implement PO form (role-based) + quiz UI
7. Implement engine, results, and ranking
8. Add unit tests for engine services
9. Add `.env.example` files
10. Update README with full setup instructions

---

## Output Rules

- Start by proposing the **full file tree**
- Then work phase by phase
- For each phase show: files created/updated, why, what remains
- Do not skip unit tests for `engine/` services
- Do not invent business rules not documented here
- If a detail is missing, choose the simplest implementation consistent with this prompt

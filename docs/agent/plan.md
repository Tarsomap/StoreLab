# plan.md
# Retail Game Platform — Plano Técnico

> Este documento é a fonte da verdade técnica do projeto.
> Ao implementar qualquer feature, siga rigorosamente as decisões aqui documentadas.
> Em caso de conflito entre este documento e qualquer outro, este prevalece.
>
> **Todos os valores de negócio foram validados e consolidados no `spec.md` v1.1 (25/03/2026).**
> Não existem mais itens PENDING neste documento.

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
│   │   ├── assistant/      # IA explicadora sob demanda, isolada do motor
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
    │   ├── features/assistant # Chat flutuante contextual do Assistente StoreLab
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

### Seed Data (validado — spec.md v1.1)

#### Categories

| key | label | unit_cost | tax_rate | breakage_rate | aging_rate | stock_available |
|---|---|---|---|---|---|---|
| PERECIVEIS | Perecíveis | 20.00 | 0.12 | 0.020 | 0.058 | 4000 |
| MERCEARIA | Mercearia | 30.00 | 0.07 | 0.015 | 0.008 | 6000 |
| ELETRO | Eletro | 500.00 | 0.25 | 0.000 | 0.013 | 700 |
| HIPEL | Hipel | 45.00 | 0.17 | 0.010 | 0.011 | 5000 |

> Decisão registrada: imposto de Eletro = 25% (tabela oficial).
> O gabarito xlsx mostra 0% por erro de preenchimento manual. Prevalece a tabela oficial.

#### CAPEX Options

| key | label | acquisition_cost | downtime_fixed_days | monthly_license_delta | maintenance_saving |
|---|---|---|---|---|---|
| SECURITY | Segurança | 50000.00 | 2 | 100.00 | 0.00 |
| FREEZER | Balança/Freezer | 75000.00 | 1 | 0.00 | 400.00 |
| NETWORK | Redes | 80000.00 | 2 | 0.00 | 0.00 |
| SITE | Melhorias no Site | 65000.00 | 1 | 150.00 | 0.00 |
| SELF_CHECKOUT | Self Checkout | 80000.00 | 2 | 320.00 | 0.00 |
| AUTOMATION | Melhoria Contínua | 45000.00 | 0 | 0.00 | 0.00 |

> `downtime_fixed_days` é o valor fixo da fórmula: **dias parados = downtime_fixed_days + SLA_TABLE[serviceOperators]**.
> AUTOMATION tem downtime_fixed_days = 0 pois não gera evento de incidente.
> Total possível de CAPEX: R$ 395.000 (caixa inicial: R$ 700.000).

#### SLA Table

| service_operators | sla_days |
|---|---|
| 0 | 6 |
| 1 | 5 |
| 2 | 4 |
| 3 | 3 |
| 4 | 2 |
| 5 | 1 |

#### System Constants

```typescript
IDEAL_CASHIER_OPERATORS = 10       // denominador do CSAT
INITIAL_CASH            = 700000   // caixa inicial por loja (R$)
INTEREST_RATE_MONTHLY   = 0.12     // juros sobre excedente de caixa
BASE_LICENSE_COST       = 500      // licença base mensal (R$)
```

---

## Game State Machine

Session progresses through these states in order:

```
SETUP → ROUND_1_CONFIG → ROUND_1 → RECONFIGURATION → ROUND_2 → ROUND_3 → FINISHED
```

**Transitions:**
- `SETUP → ROUND_1_CONFIG`: Facilitador cria as 4 lojas e todos os jogadores entram com seus papéis
- `ROUND_1_CONFIG → ROUND_1`: Todas as 4 lojas confirmam o PO (round=1, config=1)
- `ROUND_1 → RECONFIGURATION`: Motor finaliza o cálculo da rodada 1
- `RECONFIGURATION → ROUND_2`: Transferência obrigatória concluída + todas as lojas confirmam PO (round=2, config=2)
- `ROUND_2 → ROUND_3`: Motor finaliza o cálculo da rodada 2
- `ROUND_3 → FINISHED`: Motor finaliza o cálculo da rodada 3 (Quebras e Aging aplicados)

Facilitador aciona manualmente cada transição via API.

> ⚠️ **Transferência de jogadores é OBRIGATÓRIA** após a rodada 1.
> Cada loja deve transferir 1–2 jogadores para outras lojas antes de desbloquear a 2ª Configuração.
> O Gerente da Loja (role: STORE_MANAGER) **nunca pode ser transferido**.

---

## Calculation Engine — Business Rules

### CSAT
```typescript
csat = (cashierOperators / IDEAL_CASHIER_OPERATORS) * quizScorePercentage
// IDEAL_CASHIER_OPERATORS = 10
// quizScorePercentage = correctAnswers / totalQuestions (0 to 1)
// Ex.: 5 operadores + 90% quiz → (5/10) * 0.90 = 0.45
```

### Demand Distribution
```typescript
// Cada indicador recebe rank 1–4 entre as lojas (4 = melhor)
// Preço da Cesta: MENOR é melhor (rank 4 = menor preço)
// Disponibilidade: MAIOR é melhor (rank 4 = maior disponibilidade)
// CSAT: MAIOR é melhor (rank 4 = maior CSAT)

storeScore  = priceRank + availabilityRank + csatRank  // máximo 12, mínimo 3; soma total das 4 lojas sempre = 30
demandShare = storeScore / totalScoreAllStores
stockSold   = totalAvailableStock * demandShare

// Disponibilidade por categoria:
availability = storeStockPurchased / totalStockAvailableInSession
// Disponibilidade geral = média ponderada por volume das categorias
```

### Financial Calculation (per store per round)
```typescript
// --- POR CATEGORIA ---
grossRevenue = stockSold * (unitCost * (1 + priceMargin))
taxAmount    = grossRevenue * category.taxRate
costOfGoods  = stockSold * category.unitCost
unsoldStock  = stockPurchased - stockSold

// --- QUEBRAS E AGING ---
// Calculados APENAS ao final da RODADA 3
// Sobre o estoque total não vendido acumulado nas 3 rodadas
breakageAmount = totalUnsoldStock * unitCost * category.breakageRate  // só round 3
agingAmount    = totalUnsoldStock * unitCost * category.agingRate      // só round 3

// --- TOTAIS DA LOJA ---
totalGrossRevenue = sum(grossRevenue por categoria)
totalTax          = sum(taxAmount por categoria)
totalCOGS         = sum(costOfGoods por categoria)

// --- CUSTOS FIXOS ---
payrollCost     = (cashierOperators * 1000) + (serviceOperators * 1200)
maintenanceCost = capexFreezerImplemented ? 0 : 400

// --- LICENÇAS ---
licenseCost = BASE_LICENSE_COST + sum(capex.monthly_license_delta for implementedCapexes)
// Ex.: SECURITY + SELF_CHECKOUT → 500 + 100 + 320 = R$920/mês

// --- JUROS ---
interestCost = cashUsed > INITIAL_CASH ? (cashUsed - INITIAL_CASH) * INTEREST_RATE_MONTHLY : 0

// --- PERDAS POR SLA ---
// diasParados = capex.downtime_fixed_days + SLA_TABLE[serviceOperators]
// revenueLost = (grossRevenue / 30) * diasParados
slaRevenueLost = sum(slaEvent.revenueLost for this store/round)

// --- RESULTADO FINAL ---
netRevenue       = totalGrossRevenue - totalTax
totalCosts       = totalCOGS + breakageAmount + agingAmount
                 + payrollCost + maintenanceCost + licenseCost
                 + interestCost + slaRevenueLost
ebitda           = netRevenue - totalCosts
ebitdaPercentage = ebitda / totalGrossRevenue
```

### SLA Events

#### Type 1: CAPEX-based (random events per round)

| CAPEX não implementado | Risco/rodada | Impacto |
|---|---|---|
| SECURITY | 15% | Loja parada por (2 + SLA) dias |
| FREEZER | 10% | Perecíveis indisponíveis por (1 + SLA) dias |
| NETWORK | 5% | Loja parada por (2 + SLA) dias |
| SITE | 10% | Loja parada por (1 + SLA) dias |
| SELF_CHECKOUT | 20% | Perda de vendas por (2 + SLA) dias |
| AUTOMATION | 0% | Sem incidente |

```typescript
// Usa hash determinístico para reprodutibilidade:
// hash(`${sessionId}-${storeId}-${round}-${capexKey}`)
```

#### Type 2: SLA Resolution Table
```typescript
const SLA_TABLE: Record<number, number> = {
  0: 6,
  1: 5,
  2: 4,
  3: 3,
  4: 2,
  5: 1,
}
// diasParados = capex.downtime_fixed_days + SLA_TABLE[serviceOperators]
```

### Reconfiguration Constraints
```typescript
// OBRIGATÓRIO: 1–2 transferências de jogadores por loja antes de desbloquear
// STORE_MANAGER nunca pode ser transferido
// Loja de destino não pode ter 2 pessoas com o mesmo papel

availableCash = initialCash - cashUsedInConfig1 + unimplementedCapexValue
// NÃO pode usar receita de vendas já realizadas
// NÃO pode remanejar estoque entre categorias
```

---

## WebSocket Events

### Rooms
- `session:{sessionId}` — todos os participantes da sessão
- `store:{storeId}` — todos os membros de uma loja específica
- `facilitator:{sessionId}` — somente o facilitador

### Events (Server → Client)
```
plan:updated          → { plan }            emitido ao store room em qualquer alteração no PO
store:confirmed       → { storeId }         emitido ao facilitador quando loja confirma PO
round:started         → { round }           emitido ao session room
round:results         → { results[] }       emitido ao session room após motor rodar
session:finished      → { finalResults[] }  emitido ao session room
sla:event             → { slaEvent }        emitido ao store room quando evento SLA ocorre
quiz:player-answered  → { userId, storeId, round, answered, total } emitido ao store room
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
POST   /sessions                    → criar sessão
GET    /sessions/:id                → detalhes da sessão
PATCH  /sessions/:id/advance        → avançar estado (facilitador only)
GET    /sessions/:id/status         → status de todas as lojas
```

### Stores
```
POST   /sessions/:id/stores         → criar loja
POST   /stores/:id/join             → entrar na loja com papel
PATCH  /stores/:id/transfer         → transferir jogadores (facilitador, obrigatório após rodada 1)
```

### Plans
```
GET    /plans/:storeId/:round       → plano atual da loja
PATCH  /plans/:id/category          → atualizar decisão de categoria
PATCH  /plans/:id/capex             → atualizar decisão de CAPEX
PATCH  /plans/:id/workforce         → atualizar decisão de equipe
POST   /plans/:id/confirm           → confirmar PO (store manager only, requer quiz respondido)
```

### Quiz
```
POST   /sessions/:sessionId/quiz/questions        → criar perguntas (facilitador)
GET    /sessions/:sessionId/quiz/questions        → listar com gabarito (facilitador)
GET    /stores/:storeId/quiz?round=N              → quiz sem gabarito (player)
POST   /stores/:storeId/quiz/submit               → submeter respostas (player, 1x por rodada)
POST   /quiz/stores/:storeId/consolidate          → consolidar score (internal/engine)
```

### Engine
```
POST   /engine/run-round            → disparar cálculo da rodada (facilitador only)
```

### Results
```
GET    /results/:sessionId          → todos os resultados por rodada
GET    /results/:sessionId/ranking  → ranking por % EBITDA
```

### Assistant
```
POST   /assistant/ask                → explicação sob demanda sobre jogo, sessão, loja e indicadores
```

Request:
```json
{
  "sessionId": "opcional",
  "storeId": "opcional",
  "question": "Por que meu EBITDA caiu?"
}
```

Response:
```json
{
  "answer": "texto do assistente",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "fallbackUsed": false
}
```

Regras:
- Protegido por JWT.
- O assistente explica dados já persistidos de sessão, loja, PO, ranking e resultados.
- Não importa nem chama o `EngineModule`; não recalcula indicadores.
- Perguntas fora do escopo do jogo recebem recusa educada.

Variáveis de ambiente:
```env
ASSISTANT_PROVIDER_ORDER="openai,groq"
ASSISTANT_MAX_TOKENS="700"
ASSISTANT_TEMPERATURE="0.2"
ASSISTANT_REASONING_EFFORT="minimal"

OPENAI_API_KEY=""
ASSISTANT_MODEL="gpt-4o-mini"
ASSISTANT_FALLBACK_MODELS="gpt-4.1-mini,gpt-4o,gpt-4.1-nano,gpt-5-mini,gpt-5.4-mini,gpt-5.4-nano"

GROQ_API_KEY=""
GROQ_MODEL="llama-3.1-8b-instant"
GROQ_FALLBACK_MODELS="meta-llama/llama-4-scout-17b-16e-instruct,llama-3.3-70b-versatile,qwen/qwen3-32b,openai/gpt-oss-20b,openai/gpt-oss-120b,groq/compound-mini"
GROQ_BASE_URL="https://api.groq.com/openai/v1"
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

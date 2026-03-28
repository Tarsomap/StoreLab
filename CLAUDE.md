# Retail Game Platform — CLAUDE.md

> Lido automaticamente pelo Claude Code em toda sessão.
> Fonte da verdade: `docs/agent/spec.md` (regras) → `docs/agent/plan.md` (técnico) → `docs/agent/PROMPT.md` (implementação)

## Sobre o Projeto

Plataforma web gamificada de simulação de gestão de loja de varejo.
4 lojas competem em 3 rodadas. Cada loja = 5 jogadores com papéis fixos.
Jogadores preenchem um Plano Operacional (PO) colaborativo por rodada.
Motor de cálculo gera EBITDA automaticamente. Maior %EBITDA vence.

## Stack

- Backend: NestJS 10 + TypeScript 5 + Prisma 5 + PostgreSQL 15
- Frontend: Next.js 14 + Tailwind CSS + shadcn/ui + Zustand
- Real-time: Socket.io 4
- Auth: JWT (1h) + Refresh Token (7d) + bcrypt

## Comandos

```bash
# Backend
cd backend && npm run start:dev
cd backend && npm run test
cd backend && npm run test:cov
cd backend && npx prisma migrate dev
cd backend && npx prisma db seed
cd backend && npx prisma studio

# Frontend
cd frontend && npm run dev
```

## Regras de Código (OBRIGATÓRIAS)

- NUNCA usar `any` — tipar tudo com interfaces em arquivos dedicados
- Controllers são THIN — toda lógica vai nos Services
- Usar DTOs com class-validator em todo endpoint
- Constantes de negócio CENTRALIZADAS em `src/engine/constants.ts` ou seed
- Testes unitários obrigatórios para `engine/` (cobertura ≥ 80%)
- Hash determinístico para SLA: `hash(\`${sessionId}-${storeId}-${round}-${capexKey}\`)`, NUNCA Math.random()

## Regras de Negócio Críticas

- Estoque = UNIDADES (quantidade), nunca R$
- Caixa inicial = R$ 700.000 (configurável pelo facilitador)
- Juros = 12% a.m. sobre excedente acima de R$ 700k
- CSAT = (cashierOperators / 10) × quizScorePercentage (como decimal 0–1)
- Demanda distribuída por ranking 1–4 em 3 indicadores (preço, disponibilidade, CSAT)
- Demand Share = pontos_loja / soma_total_pontos
- Quebras e Aging: SOMENTE no fim da rodada 3, sobre estoque total acumulado não vendido
- Transferências são OBRIGATÓRIAS (1–2 por loja após rodada 1)
- STORE_MANAGER nunca pode ser transferido
- PO só pode ser confirmado pelo STORE_MANAGER, após todos responderem o quiz

## Constantes Validadas (spec.md v1.1)

```
IDEAL_CASHIER_OPERATORS = 10
INITIAL_CASH            = 700000
INTEREST_RATE_MONTHLY   = 0.12
BASE_LICENSE_COST       = 1200  // 120(SO) + 80(PDV) + 500(Site) + 500(Segurança)
CASHIER_SALARY          = 1000
SERVICE_SALARY          = 1200
MAINTENANCE_COST        = 400  // só se FREEZER NÃO implementado

SLA_TABLE = { 0:6, 1:5, 2:4, 3:3, 4:2, 5:1 }
// diasParados = capex.downtimeFixedDays + SLA_TABLE[serviceOperators]
```

## Seed Data (NÃO alterar sem validação)

### Categories
| key | unit_cost | tax_rate | breakage | aging | stock |
|-----|-----------|----------|----------|-------|-------|
| PERECIVEIS | 20.00 | 0.12 | 0.020 | 0.058 | 4000 |
| MERCEARIA | 30.00 | 0.07 | 0.015 | 0.008 | 6000 |
| ELETRO | 500.00 | 0.25 | 0.000 | 0.013 | 700 |
| HIPEL | 45.00 | 0.17 | 0.010 | 0.011 | 5000 |

### CAPEX Options
| key | cost | downtime_days | license_delta | maint_saving | sla_risk |
|-----|------|---------------|---------------|--------------|----------|
| SECURITY | 50000 | 2 | 100 | 0 | 0.15 |
| FREEZER | 75000 | 1 | 0 | 400 | 0.10 |
| NETWORK | 80000 | 2 | 0 | 0 | 0.05 |
| SITE | 65000 | 1 | 150 | 0 | 0.10 |
| SELF_CHECKOUT | 80000 | 2 | 320 | 0 | 0.20 |
| AUTOMATION | 45000 | 0 | 0 | 0 | 0.00 |

## Session State Machine

```
SETUP → ROUND_1_CONFIG → ROUND_1 → RECONFIGURATION → ROUND_2 → ROUND_3 → FINISHED
```

## Ordem de Implementação

1. PrismaService (módulo compartilhado)
2. Auth (register, login, refresh, guards)
3. Users (CRUD básico)
4. Sessions (CRUD, state machine, invite codes)
5. Stores (CRUD, membros, papéis)
6. Plans (PO: category decisions, CAPEX decisions, workforce, confirm)
7. Quiz (questions, answers, consolidation)
8. Engine (CSAT → Demand → Shrinkage → Financial → SLA → Transfer)
9. Results (round results, ranking, breakdown)
10. Gateway (WebSocket: po:updated, round:results, session events)
11. Frontend (auth → dashboard → PO → quiz → results)

## Arquivos para ler antes de implementar

- `docs/agent/spec.md` — regras de negócio e fórmulas validadas
- `docs/agent/plan.md` — schema Prisma, contratos REST, WebSocket events
- `docs/agent/PROMPT.md` — prompt completo de implementação
- `docs/agent/QUIZ.md` — especificação completa do quiz

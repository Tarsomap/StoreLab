# Arquitetura Técnica — Retail Game Platform
**Residência em Software II | Squad 14**

---

## 1. Visão Geral do Sistema

Plataforma web gamificada de simulação de gestão operacional de loja. Múltiplos times competem em tempo real, tomando decisões de estoque, pricing, equipe e investimento (CAPEX), com o resultado financeiro (EBITDA) calculado automaticamente ao final de cada rodada.

---

## 2. Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Navegador)                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Next.js + Tailwind CSS + shadcn/ui                           │   │
│  │  - Dashboard Facilitador (controle de sessões e rodadas)     │   │
│  │  - Tela Colaborativa PO (equipes preenchem decisões)        │   │
│  │  - Ranking em Tempo Real (Socket.io)                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                        │
│                              │ HTTP + WebSocket                       │
│                              ▼                                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌──────────────────────────────────┐  ┌──────────────────────────────┐
│    BACKEND (NestJS)              │  │   WebSocket Gateway          │
│                                  │  │   (Socket.io)                │
│ ┌─ Controllers (HTTP)            │  │  - Eventos de PO             │
│ │  /auth, /sessions, /plans      │  │  - Broadcast de resultados   │
│ │  /stores, /results             │  │  - Salas por sessão/loja    │
│ │                                │  │                              │
│ ├─ Services (Lógica)             │  └──────────────────────────────┘
│ │  AuthService                   │
│ │  SessionService                │         │
│ │  PlanService                   │         │
│ │  EngineService (motor)         │         │
│ │  FinancialService              │         │
│ │  SlaService                    │         │
│ │  CsatService                   │
│ │  DemandService                 │
│ │                                │
│ └─ Modules (Organizeção)       │
│    auth, sessions, stores       │
│    plans, engine, results       │
│                                  │
└──────────────────────────────────┘
                │
                │ Prisma ORM
                ▼
┌──────────────────────────────────┐
│    PostgreSQL (BD Relacional)    │
│                                  │
│  USER, SESSION, STORE            │
│  OPERATIONAL_PLAN                │
│  PO_CATEGORY_DECISION            │
│  ROUND_RESULT                    │
│  SLA_EVENT                       │
│                                  │
│  (Seeds: CATEGORY, CAPEX_OPTION) │
│                                  │
└──────────────────────────────────┘
```

---

## 3. Stack Tecnológica

| Camada | Tecnologia | Versão Alvo |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Back-end | NestJS | 10.x |
| ORM | Prisma | 5.x |
| Banco de Dados | PostgreSQL | 15+ |
| WebSocket | Socket.io | 4.x |
| Front-end | Next.js | 14.x |
| Estilização | Tailwind CSS + shadcn/ui | latest |
| Autenticação | JWT + Refresh Token | — |
| Linguagem | TypeScript | 5.x |
| Deploy | Railway / Render | — |
| Versionamento | GitHub | — |

### Justificativas de Decisão

**NestJS vs Express**
NestJS foi escolhido por sua estrutura modular e opinada. Isso significa que cada domínio do sistema (sessões, lojas, plano operacional, motor de cálculo) vive em seu próprio módulo com separação clara de responsabilidades. Essa estrutura também performa melhor com agentes de IA (Cursor, Claude Code) pois há convenções explícitas a seguir.

**PostgreSQL vs MongoDB**
O Plano Operacional é um domínio fortemente relacional: sessões têm lojas, lojas têm planos, planos têm decisões por categoria. Relações com integridade referencial e cálculos que cruzam múltiplas tabelas são o core do sistema — PostgreSQL é a escolha natural.

**Prisma vs TypeORM**
Prisma oferece um schema declarativo único (`schema.prisma`) que serve como fonte da verdade do banco. Migrations automáticas e tipagem nativa com TypeScript reduzem bugs e aceleram o desenvolvimento assistido por IA.

**Socket.io**
As rodadas ocorrem com múltiplos times simultaneamente. A experiência de jogo exige que todos os jogadores de uma sessão vejam atualizações (caixa, EBITDA projetado, confirmações, resultados) sem precisar recarregar a página. WebSockets são obrigatórios para isso.

---

## 4. Arquitetura da Aplicação

### 4.1 Estrutura de Módulos NestJS

```
src/
├── auth/           # Registro, login, JWT, guards
├── users/          # Gestão de usuários
├── sessions/       # CRUD de sessões, controle de estado/rodadas
├── stores/         # Lojas, membros, papéis
├── plans/          # Plano Operacional (PO), decisões por categoria e CAPEX
├── engine/         # Motor de cálculo: CSAT, demanda, EBITDA
├── results/        # Round Results, ranking, histórico
├── events/         # SLA Events, eventos aleatórios
├── gateway/        # Socket.io gateway (tempo real)
├── seed/           # Dados iniciais: categorias, CAPEX options
└── common/         # Guards, interceptors, pipes, DTOs compartilhados
```

### 4.2 Fluxo de Dados — Tempo Real (Exemplo: Jogador atualiza estoque)

```
Jogador altera estoque de PERECIVEIS via UI
        │
        ▼
HTTP PUT /plans/:planId/category-decision
        │
        ▼
PlansController.updateCategoryDecision()
        │
        ▼
PlansService.updateDecision()
        ├─► Atualiza PO_CATEGORY_DECISION no BD
        ├─► Recalcula cash_used = Σ(stock_purchased × unit_cost)
        ├─► Recalcula projected_ebitda (fórmula)
        │
        ▼
Gateway.emitToPlanRoom(store.id, 'po:updated')
        │
        ▼
Todos os jogadores da loja veem instantaneamente:
  - Novo cash_used
  - Novo projected_ebitda
  - Indicador visual: ✓ se valores válidos
```

### 4.3 Fluxo de Execução de Rodada (Engine)

```
Facilitador clica "Executar Rodada 1" (todos confirmaram PO)
        │
        ▼
SessionsController.executeRound(sessionId)
        │
        ▼
EngineService.runRound(sessionId, round)
        │
        ├─► SlaService.applyEvents(stores)
        │   Sorteia eventos por loja
        │   Registra SLA_EVENT no BD
        │
        ├─► CsatService.calculate(stores)
        │   CSAT = (operadores / 10) × quiz_score%
        │
        ├─► DemandService.distribute(stores)
        │   Calcula scores de cada loja por indicador
        │   Distribui demand_share proporcional
        │
        ├─► FinancialService.calculate(stores)
        │   Aplica fórmula de EBITDA para cada loja
        │   Armazena breakdown completo
        │
        └─► ResultService.persistRoundResults(results)
            Insere ROUND_RESULT para cada loja
                │
                ▼
            Gateway.emitToSession('round:completed')
            Broadcast para todos:
              - Ranking final desta rodada
              - Breakdown de cada loja
              - Status avança para RECONFIGURATION
```

---

## 5. Modelagem do Banco de Dados

### 5.1 Diagrama de Entidades Relacional

```
USER
  ├─ FACILITATOR_ID →─┐
  │                   ├─ SESSION ─→ STORE ─→ OPERATIONAL_PLAN
  │                   │               │           │
  └─→ STORE_MEMBER ───┘               │      ┌─ PO_CATEGORY_DECISION ─→ CATEGORY (seed)
                                      │      └─ PO_CAPEX_DECISION ──→ CAPEX_OPTION (seed)
                                      │
                                      ├─ ROUND_RESULT
                                      ├─ SLA_EVENT
                                      └─ QUIZ_ANSWER

SESSION
  ├─ SESSION_CATEGORY_CONFIG ──→ CATEGORY
  ├─ ROUND_RESULT
  ├─ SLA_EVENT
  └─ PLAYER_TRANSFER ──→ USER
```

### 5.2 Schema Prisma (Essencial)

```prisma
model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(PLAYER)
  createdAt    DateTime @default(now())
  storeMembers StoreMember[]
  sessions     Session[]  @relation("FacilitatorSessions")
}

enum Role { FACILITATOR PLAYER }

model Session {
  id            String          @id @default(uuid())
  name          String
  facilitator   User            @relation("FacilitatorSessions", fields: [facilitatorId], references: [id])
  facilitatorId String
  status        SessionStatus   @default(SETUP)
  initialCash   Float           @default(700000)
  createdAt     DateTime        @default(now())
  stores        Store[]
  categoryConfigs SessionCategoryConfig[]
  roundResults  RoundResult[]
  slaEvents     SlaEvent[]
  transfers     PlayerTransfer[]
}

enum SessionStatus { SETUP ROUND_1 RECONFIGURATION ROUND_2 ROUND_3 FINISHED }

model Store {
  id          String        @id @default(uuid())
  session     Session       @relation(fields: [sessionId], references: [id])
  sessionId   String
  name        String
  createdAt   DateTime      @default(now())
  members     StoreMember[]
  plans       OperationalPlan[]
  results     RoundResult[]
  quizAnswers QuizAnswer[]
}

model StoreMember {
  id      String    @id @default(uuid())
  store   Store     @relation(fields: [storeId], references: [id])
  storeId String
  user    User      @relation(fields: [userId], references: [id])
  userId  String
  role    StoreRole
}

enum StoreRole { STORE_MANAGER SUPPLY_MANAGER COMMERCIAL_MANAGER OPERATIONAL_MANAGER SERVICE_MANAGER }

model Category {
  id           String   @id @default(uuid())
  name         CategoryName
  unitCost     Float
  taxRate      Float
  breakageRate Float
  agingRate    Float
  decisions    PoCategoryDecision[]
  sessionConfigs SessionCategoryConfig[]
}

enum CategoryName { PERECIVEIS MERCEARIA ELETRO HIPEL }

model SessionCategoryConfig {
  id             String   @id @default(uuid())
  session        Session  @relation(fields: [sessionId], references: [id])
  sessionId      String
  category       Category @relation(fields: [categoryId], references: [id])
  categoryId     String
  availableStock Float
  expectedDemand Float
}

model OperationalPlan {
  id                String    @id @default(uuid())
  store             Store     @relation(fields: [storeId], references: [id])
  storeId           String
  round             Int
  configuration     Int       @default(1)
  status            PlanStatus @default(DRAFT)
  cashUsed          Float     @default(0)
  projectedEbitda   Float     @default(0)
  cashierOperators  Int       @default(0)
  serviceOperators  Int       @default(0)
  payrollCost       Float     @default(0)
  confirmedAt       DateTime?
  categoryDecisions PoCategoryDecision[]
  capexDecisions    PoCapexDecision[]
}

enum PlanStatus { DRAFT CONFIRMED }

model PoCategoryDecision {
  id              String          @id @default(uuid())
  plan            OperationalPlan @relation(fields: [planId], references: [id])
  planId          String
  category        Category        @relation(fields: [categoryId], references: [id])
  categoryId      String
  stockPurchased  Float
  priceMargin     Float
  stockSold       Float?
  revenue         Float?
  taxAmount       Float?
  breakageAmount  Float?
  agingAmount     Float?
}

model CapexOption {
  id                  String     @id @default(uuid())
  name                String
  type                CapexType
  cost                Float
  monthlyLicenseDelta Float      @default(0)
  slaImpactDays       Int        @default(0)
  decisions           PoCapexDecision[]
}

enum CapexType { SECURITY FREEZER NETWORK SITE SELF_CHECKOUT AUTOMATION }

model PoCapexDecision {
  id          String          @id @default(uuid())
  plan        OperationalPlan @relation(fields: [planId], references: [id])
  planId      String
  capex       CapexOption     @relation(fields: [capexId], references: [id])
  capexId     String
  implemented Boolean         @default(false)
}

model QuizAnswer {
  id              String  @id @default(uuid())
  store           Store   @relation(fields: [storeId], references: [id])
  storeId         String
  round           Int
  totalQuestions  Int
  correctAnswers  Int
  scorePercentage Float
}

model RoundResult {
  id                 String  @id @default(uuid())
  session            Session @relation(fields: [sessionId], references: [id])
  sessionId          String
  store              Store   @relation(fields: [storeId], references: [id])
  storeId            String
  round              Int
  demandScore        Int
  demandShare        Float
  csatScore          Float
  availabilityScore  Float
  basketPriceScore   Float
  grossRevenue       Float
  netRevenue         Float
  totalCosts         Float
  ebitda             Float
  ebitdaPercentage   Float
}

model SlaEvent {
  id           String  @id @default(uuid())
  session      Session @relation(fields: [sessionId], references: [id])
  sessionId    String
  store        Store   @relation(fields: [storeId], references: [id])
  storeId      String
  round        Int
  capexType    CapexType
  daysImpacted Int
  revenueLost  Float
}

model PlayerTransfer {
  id          String   @id @default(uuid())
  session     Session  @relation(fields: [sessionId], references: [id])
  sessionId   String
  user        User     @relation(fields: [userId], references: [id])
  userId      String
  fromStore   Store    @relation("TransferFrom", fields: [fromStoreId], references: [id])
  fromStoreId String
  toStore     Store    @relation("TransferTo", fields: [toStoreId], references: [id])
  toStoreId   String
  transferredAt DateTime @default(now())
}
```

---

## 6. Tabela de Valores de Seed (Constantes de Negócio)

### 6.1 CATEGORY (Categorias de Produtos)

| Name | Unit Cost | Tax Rate | Breakage % | Aging % |
|---|---|---|---|---|
| PERECIVEIS | R$ 8.00 | 9.25% | 3.0% | 2.0% |
| MERCEARIA | R$ 5.00 | 7.65% | 1.0% | 0.0% |
| ELETRO | R$ 120.00 | 12.50% | 0.2% | 5.0% |
| HIPEL | R$ 45.00 | 7.65% | 0.5% | 1.0% |

### 6.2 CAPEX_OPTION (Opções de Investimento)

| Type | Cost | Monthly License | SLA Risk | Impact Type |
|---|---|---|---|---|
| SECURITY | R$ 30.000 | R$ 2.000 | 15% | 2% revenue loss |
| FREEZER | R$ 80.000 | R$ 1.500 | 10% | +30% aging |
| NETWORK | R$ 50.000 | R$ 3.000 | 5% | 1h downtime |
| SITE | R$ 100.000 | R$ 5.000 | 0% | N/A (brand) |
| SELF_CHECKOUT | R$ 60.000 | R$ 2.500 | 0% | N/A (speed) |
| AUTOMATION | R$ 40.000 | R$ 1.000 | 0% | N/A (labor) |

### 6.3 Operação de Caixa (Fixed Costs)

| Item | Value |
|---|---|
| **Initial Cash** | R$ 700.000 |
| **Monthly Maintenance** | R$ 5.000 |
| **Cashier Salary** | R$ 2.000/mês |
| **Service Operator Salary** | R$ 2.500/mês |
| **Excess Cash Interest** | 1.0% a.m. (juros se > R$700k) |

### 6.4 Regras de Negocio (Constants)

| Item | Value | Justificativa |
|---|---|---|
| **Operators per Cashier** | 10 | Quadro ideal para cálculo de CSAT |
| **Quiz Questions** | 10 | Base para cálculo de quiz_score% |
| **Max Player Transfer** | 2 | Por loja, apenas em reconfiguration |
| **Rounds per Session** | 3 | 1ª, 2ª, 3ª rodadas (determinada) |
| **SLA Event Probability** | Por CAPEX | Veja CAPEX_OPTION.sla_risk |
| **CSAT Formula** | (ops/10) × (quiz%) | Balanceado entre equipe e conhecimento |
| **Demand Distribution** | Scoring 1-4 | Ranking por indicador |

---

## 7. Regras de Negócio Críticas

### 7.1 Cálculo do CSAT
```
CSAT = (operadores_caixa_contratados / 10) × (quiz_score_percentage / 100)

Exemplo:
  Operadores: 8
  Quiz Score: 80%
  CSAT = (8/10) × (80/100) = 0.64 ou 64%
```

### 7.2 Distribuição de Demanda
```
Cada indicador (Preço, Disponibilidade, CSAT) recebe pontuação 1-4 entre as lojas:
  - Melhor loja no indicador → 4 pontos
  - 2º lugar → 3 pontos
  - 3º lugar → 2 pontos
  - Pior loja no indicador → 1 ponto

Demand Share = soma_pontos_loja / suma_pontos_todas_lojas
Demand Absoluta = Demand_Share × Total_Demanda_Sessão
```

### 7.3 EBITDA (Fórmula Completa)
```
Receita Bruta = Demanda_Absolutia × Preço_Unitário

Impostos = Receita_Bruta × Tax_Rate (por categoria)

Receita Líquida = Receita_Bruta - Impostos

Custo_de_Venda = Demanda_Absoluta × Unit_Cost

Margem_Bruta = Receita_Líquida - Custo_de_Venda

Estoque_Residual = Stock_Purchased - Stock_Sold

Quebras = Estoque_Residual × Breakage_Rate

Aging = Estoque_Residual × Aging_Rate

Margem_Líquida = Margem_Bruta - Quebras - Aging

Folha_de_Pagamento = (cashier_operators × 2000) + (service_operators × 2500)

Manutenção = R$ 5.000 (fixo)

Licenças = Σ(CAPEX_Option.monthlyLicense se implemented)

Juros_Excedente = MAX(0, (Cash_Disponivel - 700000) × 1%)

SLA_Perdas = Σ(SLA_Event.revenue_lost)

EBITDA = Margem_Líquida - Folha - Manutenção - Licenças - Juros - SLA_Perdas

% EBITDA = EBITDA / Receita_Bruta
```

### 7.4 Eventos SLA
```
Para cada CAPEX NÃO implementado:
  1. Sorteia evento com probabilidade = CAPEX_Option.sla_risk
  2. Se evento ocorre:
     - Registra SLA_EVENT no BD
     - Calcula receita perdida = (receita_diária_estimada × dias_impactados)
     - Desconta de EBITDA

Exemplo:
  SECURITY não contratado + sorteio positivo (15%)
    → Roubo ocorre
    → Receita perdida = 2% do que seria gerado
```

### 7.5 Restrições de Reconfiguração (2ª Configuração)
```
- Só pode usar caixa não utilizado da 1ª Configuração
- Pode reutilizar valor de CAPEX ainda não implementado
- NÃO pode usar receita de vendas já realizadas
- NÃO pode remanejar estoque entre categorias
- Movimentação máxima: 2 jogadores por loja
```

---

## 8. WebSocket Events (Tempo Real)

### 8.1 Eventos do Cliente para o Servidor

```javascript
// Quando jogador altera decisões do PO
socket.emit('po:update-stock', {storeId, categoryId, quantity})
socket.emit('po:update-pricing', {storeId, categoryId, margin})
socket.emit('po:update-operators', {storeId, cashier, service})
socket.emit('po:toggle-capex', {storeId, capexId})

// Quando gerente confirma configuração
socket.emit('po:confirm', {storeId, round})

// Transfer de jogadores
socket.emit('player:transfer', {userId, fromStoreId, toStoreId})
```

### 8.2 Eventos do Servidor para os Clientes

```javascript
// Atualização de PO em tempo real (broadcast para a sala da loja)
socket.to(`store:${storeId}`).emit('po:updated', {
  cashAvailable,
  projectedEbitda,
  categoryDecisions: [...],
  capexDecisions: [...]
})

// Rodada iniciada
socket.to(`session:${sessionId}`).emit('round:started', {
  round: 1,
  status: 'EXECUTING',
  timer: 60 // segundos
})

// Resultados publicados (após rodada executada)
socket.to(`session:${sessionId}`).emit('round:results', {
  storeResults: [
    {storeId, ebitda, ebitdaPercentage, ranking}
  ],
  ranking: [...]
})

// Sessão finalizada
socket.to(`session:${sessionId}`).emit('session:finished', {
  finalRanking: [...],
  breakdown: {...}
})
```

---

## 9. Contratos de API REST

### 9.1 Autenticação

```
POST /auth/register
Body: {email, name, password}
Response: {token, refreshToken, user: {id, name, role}}
Status: 201

POST /auth/login
Body: {email, password}
Response: {token, refreshToken, user: {id, name, role}}
Status: 200

POST /auth/refresh
Body: {refreshToken}
Response: {token}
Status: 200
```

### 9.2 Gestão de Sessões

```
POST /sessions
Body: {name, initialCash, expectedDemandPerCategory}
Response: {sessionId, inviteCode}
Status: 201

GET /sessions/:sessionId/dashboard
Response: {session, stores[], members[], round, status}
Status: 200

POST /sessions/:sessionId/stores
Body: {name}
Response: {storeId}
Status: 201

POST /sessions/:sessionId/execute-round
Body: {round}
Response: {roundId, results[], ranking}
Status: 200

GET /sessions/:sessionId/results
Response: {rounds[], finalRanking[], breakdown}
Status: 200
```

### 9.3 Plano Operacional

```
POST /operational-plans
Body: {storeId, round, configuration}
Response: {planId, status: 'DRAFT'}
Status: 201

PUT /operational-plans/:planId/category-decision
Body: {categoryId, stockPurchased, priceMargin}
Response: {cashUsed, projectedEbitda}
Status: 200

PUT /operational-plans/:planId/operators
Body: {cashierOperators, serviceOperators}
Response: {cashUsed, payrollCost, projectedEbitda}
Status: 200

PUT /operational-plans/:planId/capex
Body: {capexId, implemented}
Response: {cashUsed, projectedEbitda}
Status: 200

POST /operational-plans/:planId/confirm
Response: {status: 'CONFIRMED'}
Status: 200
```

### 9.4 Resultados e Ranking

```
GET /results/:roundId
Response: {round, stores[], ranking[], breakdown}
Status: 200

GET /results/session/:sessionId/final
Response: {finalRanking[], consolidatedData}
Status: 200
```

---

## 10. Considerações de Deployment

### 10.1 Railway ou Render (Recomendado para MVP)

**Railway:**
- Free tier: 5GB més
- Deploy automático via GitHub
- PostgreSQL managed incluído
- Ideal para prototipagem rápida

**Render:**
- Free tier: 750h/mês
- Deploy via GitHub Actions
- PostgreSQL managed
- Começa a cobrar após uso

### 10.2 Variáveis de Ambiente

```bash
# Backend
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/retail_game
JWT_SECRET=xxxxx
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d
FRONTEND_URL=https://retail-game.vercel.app

# Frontend
NEXT_PUBLIC_API_URL=https://api.retail-game.com
NEXT_PUBLIC_WS_URL=wss://api.retail-game.com
```

---

## 11. Performance e Escalabilidade

### 11.1 Métricas Alvo para MVP

- **Latency da PO Update**: < 500ms (WebSocket)
- **Execução de Rodada**: < 10s (100k+ cálculos)
- **Concurrent Users per Session**: 20 (5 lojas × 4 papeis + facilitador)
- **Database Queries Otimizadas**: Índices em session_id, store_id, round

### 11.2 Opções Futuras de Escalabilidade

- Implementar Redis para cache de estados de PO
- Usar job queues (Bull) para execução de rodadas assíncronas
- Sharding de sessões para múltiplos servidores

# Arquitetura Técnica — Retail Game Platform
**Residência em Software II | Squad 14**

---

## 1. Visão Geral do Sistema

Plataforma web gamificada de simulação de gestão operacional de loja. Múltiplos times competem em tempo real, tomando decisões de estoque, pricing, equipe e investimento (CAPEX), com o resultado financeiro (EBITDA) calculado automaticamente ao final de cada rodada.

---

## 2. Stack Tecnológica

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

## 3. Arquitetura da Aplicação

### 3.1 Estrutura de Módulos NestJS

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

### 3.2 Fluxo de Dados — Tempo Real

```
Jogador faz decisão no PO
        │
        ▼
HTTP POST → PlansController
        │
        ▼
PlansService → recalcula caixa e EBITDA projetado
        │
        ▼
Gateway emite evento 'plan:updated' para a sala da loja
        │
        ▼
Todos os jogadores da loja recebem atualização instantânea
```

### 3.3 Fluxo de Execução de Rodada

```
Facilitador dispara 'session:start-round'
        │
        ▼
EngineService.runRound(sessionId, round)
        │
        ├──► SlaService.applyEvents(stores)       → registra SLA_EVENTs
        │
        ├──► CsatService.calculate(stores)        → CSAT por loja
        │
        ├──► DemandService.distribute(stores)     → demand_share por loja
        │
        ├──► FinancialService.calculate(stores)   → EBITDA por loja
        │
        └──► ResultService.persist(results)       → salva ROUND_RESULTs
                │
                ▼
        Gateway emite 'round:results' para todos da sessão
```

---

## 4. Modelagem do Banco de Dados

### 4.1 Diagrama de Entidades

```
USER ──< STORE_MEMBER >── STORE ──< OPERATIONAL_PLAN
 │                          │              │
 │                       SESSION      PO_CATEGORY_DECISION >── CATEGORY (seed)
 │                          │              │
 └──(facilitator_id)        │         PO_CAPEX_DECISION >── CAPEX_OPTION (seed)
                            │
                            ├──< SESSION_CATEGORY_CONFIG >── CATEGORY
                            ├──< ROUND_RESULT >── STORE
                            ├──< SLA_EVENT >── STORE
                            └──< PLAYER_TRANSFER

STORE ──< QUIZ_ANSWER
```

### 4.2 Entidades Detalhadas

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

## 5. Regras de Negócio Críticas

### 5.1 Cálculo do CSAT
```
CSAT = (operadores_caixa_contratados / 10) × quiz_score_percentage
```
Onde `10` é o quadro ideal de operadores definido pelo sistema.

### 5.2 Distribuição de Demanda
```
Cada indicador (Preço, Disponibilidade, CSAT) recebe pontuação 1-4 entre as lojas:
  - Melhor loja no indicador → 4 pontos
  - Pior loja no indicador   → 1 ponto

Demand Share = soma_pontos_loja / soma_pontos_todas_lojas
```

### 5.3 EBITDA
```
EBITDA =
  Receita_Bruta
  - Impostos_por_categoria
  - Custo_de_Venda
  - Quebras (% sobre estoque não vendido)
  - Aging   (% sobre estoque não vendido)
  - Folha_de_Pagamento
  - Manutenção_de_Equipamentos
  - Licenças_de_Software
  - Juros_sobre_excedente (12% a.m. sobre valor acima de R$700k)
  - Receita_perdida_por_SLA_Event

% EBITDA = EBITDA / Receita_Bruta
```

### 5.4 Eventos SLA
```
Para cada CAPEX não implementado:
  → Probabilidade de evento (definida por tipo de CAPEX)
  → Se evento ocorre: loja fica sem operar por N dias
  → Receita perdida = (receita_diária_estimada × dias_parado)
```

### 5.5 Restrições de Reconfiguração
```
- Só pode usar caixa não utilizado na 1ª Configuração
- Pode usar valor de CAPEX ainda não implementado
- NÃO pode usar receita de vendas já realizadas
- NÃO pode remanejar estoque entre categorias
- Movimentação máxima: 2 jogadores por loja
```

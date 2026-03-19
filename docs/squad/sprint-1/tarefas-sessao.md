# 🎮 Sprint 1 — Tarefas: Gestão de Sessão

> **Épico:** Gestão de Sessão
> **User Stories:** US-05, US-06, US-07, US-08, US-09
> **Estimativa total:** 2–3 semanas
>
> Leia [`docs/agent/CONTEXT.md`](../../agent/CONTEXT.md) antes de começar.

---

## Visão geral

Uma **Sessão** é uma partida completa do jogo. O Facilitador cria a sessão definindo os parâmetros reais (caixa inicial, estoque disponível por categoria, demanda esperada por categoria), cria as 4 lojas, gera códigos de acesso e controla o avanço das rodadas.

A sessão é uma **máquina de estados**. Ela só avança quando as condições corretas são cumpridas.

```
SETUP → ROUND_1 → RECONFIGURATION → ROUND_2 → ROUND_3 → FINISHED
```

---

## TASK-07 — Models de sessão, loja e membro (Prisma)

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-01

### O que fazer

Adicionar ao `schema.prisma`:

```prisma
model Session {
  id            String          @id @default(uuid())
  name          String
  facilitator   User            @relation("FacilitatorSessions", fields: [facilitatorId], references: [id])
  facilitatorId String
  status        SessionStatus   @default(SETUP)
  initialCash   Float           @default(700000)
  createdAt     DateTime        @default(now())

  stores          Store[]
  categoryConfigs SessionCategoryConfig[]
  roundResults    RoundResult[]
  slaEvents       SlaEvent[]
  transfers       PlayerTransfer[]
}

enum SessionStatus {
  SETUP
  ROUND_1
  RECONFIGURATION
  ROUND_2
  ROUND_3
  FINISHED
}

model SessionCategoryConfig {
  id             String   @id @default(uuid())
  session        Session  @relation(fields: [sessionId], references: [id])
  sessionId      String
  category       Category @relation(fields: [categoryId], references: [id])
  categoryId     String
  availableStock Float
  expectedDemand Float
}

model Store {
  id        String   @id @default(uuid())
  session   Session  @relation(fields: [sessionId], references: [id])
  sessionId String
  name      String
  createdAt DateTime @default(now())

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

enum StoreRole {
  STORE_MANAGER
  SUPPLY_MANAGER
  COMMERCIAL_MANAGER
  OPERATIONAL_MANAGER
  SERVICE_MANAGER
}
```

### Por que `SessionCategoryConfig`?
O Facilitador define o estoque disponível e a demanda esperada **por categoria, por sessão**. Esses valores não são seed global — são parâmetros reais que mudam a cada partida. Por isso ficam em uma tabela separada vinculada à sessão.

### Critérios de aceite
- [ ] Migration roda sem erros
- [ ] Todas as tabelas criadas com relacionamentos corretos
- [ ] Enum `SessionStatus` e `StoreRole` criados

---

## TASK-08 — CRUD de sessão (backend)

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-07

### Endpoints a implementar

#### `POST /sessions` — Criar sessão
```
Auth:   FACILITATOR
Body:   {
  name: string,
  initialCash: number,           // padrão 700000
  categoryConfigs: [
    { categoryId: string, availableStock: number, expectedDemand: number }
  ]
}
Response: { sessionId, inviteCode }
Status:   201
```

Lógica:
1. Validar `initialCash >= 500000`
2. Validar que chegaram configs para as 4 categorias
3. Validar `expectedDemand >= 100` por categoria
4. Criar `Session` e os 4 registros de `SessionCategoryConfig`
5. Retornar `sessionId` e `inviteCode` (código de 6 caracteres único)

#### `GET /sessions/:id` — Detalhes da sessão
```
Auth:     FACILITATOR (dono da sessão)
Response: { session, stores[], categoryConfigs[], status }
Status:   200
```

#### `GET /sessions/:id/status` — Status de todas as lojas
```
Auth:     FACILITATOR
Response: { stores: [{ id, name, membersCount, planStatus, projectedEbitda }] }
Status:   200
```

#### `PATCH /sessions/:id/advance` — Avançar estado da sessão
```
Auth:   FACILITATOR
Body:   {} (sem body, apenas a intenção de avançar)
Status: 200
```

Lógica da transição:
- `SETUP → ROUND_1`: todas as 4 lojas confirmaram o PO
- `ROUND_1 → RECONFIGURATION`: engine terminou de processar
- `RECONFIGURATION → ROUND_2`: todas confirmaram o PO da 2ª config
- `ROUND_2 → ROUND_3`: engine terminou
- `ROUND_3 → FINISHED`: engine terminou

Se a condição não foi cumprida, retornar `400 Bad Request` com mensagem explicativa.

### Critérios de aceite
- [ ] Criar sessão com parâmetros reais (caixa + configs por categoria)
- [ ] Validações de caixa mínimo e demanda mínima funcionam
- [ ] `inviteCode` único gerado por sessão
- [ ] Avanço de estado só ocorre se condição cumprida
- [ ] Avanço sem condição retorna 400 com motivo

---

## TASK-09 — CRUD de lojas e entrada de jogadores (backend)

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-08

### Endpoints a implementar

#### `POST /sessions/:id/stores` — Criar loja
```
Auth:   FACILITATOR
Body:   { name: string }
Status: 201
```
Validação: máximo 4 lojas por sessão.

#### `POST /stores/:id/join` — Jogador entra na loja
```
Auth:   PLAYER
Body:   { role: StoreRole }
Status: 200
```

Lógica:
1. Verificar que o papel não está ocupado nessa loja
2. Verificar que o jogador não está em outra loja da mesma sessão
3. Criar `StoreMember`

#### `GET /stores/:id` — Dados da loja
```
Auth:   Qualquer membro da loja
Response: { store, members[], currentPlan }
Status: 200
```

#### `PATCH /stores/transfer` — Transferir jogador entre lojas
```
Auth:   FACILITATOR
Body:   { userId, fromStoreId, toStoreId }
Status: 200
```

Validações:
- Sessão deve estar em `RECONFIGURATION`
- Não pode mover `STORE_MANAGER`
- Máximo 2 transferências por loja de origem
- Destino não pode já ter o mesmo papel

### Critérios de aceite
- [ ] Máximo 4 lojas por sessão validado
- [ ] Jogador não pode ocupar papel já preenchido
- [ ] Jogador não pode estar em duas lojas da mesma sessão
- [ ] Transferência só durante `RECONFIGURATION`
- [ ] `STORE_MANAGER` é imovível
- [ ] Máximo 2 transfers por loja de origem validado

---

## TASK-10 — Dashboard do facilitador (frontend)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-08, TASK-09

### O que fazer

Criar a página `/dashboard` acessível apenas pelo Facilitador.

**Tela: Criar sessão**
- Formulário com: nome da sessão, caixa inicial (padrão R$ 700.000)
- Para cada categoria (Perecíveis, Mercearia, Eletro, Hipel): campo de estoque disponível e demanda esperada
- Botão "Criar Sessão"
- Após criar: exibe o código de acesso e o QR Code para os jogadores

**Tela: Painel da sessão**
- 4 cards, um por loja
- Cada card: nome da loja, quantidade de jogadores, status do PO (DRAFT / CONFIRMADO), EBITDA projetado
- Indicadores visuais: verde ✔ se PO confirmado, amarelo ⚠ se em andamento, vermelho ✘ se vazio
- Botão "Executar Rodada" habilitado somente quando todas as lojas confirmaram
- Atualiza a cada 2 segundos via WebSocket

### Critérios de aceite
- [ ] Rota `/dashboard` protegida (só FACILITATOR)
- [ ] Formulário de criação envia os parâmetros reais por categoria
- [ ] Código de acesso e QR Code exibidos após criar
- [ ] Cards das lojas atualizam em tempo real
- [ ] Botão de executar rodada só ativo quando todas confirmaram

---

## TASK-11 — Tela de entrada do jogador (frontend)

**Responsável:** Frontend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-09

### O que fazer

Criar a página `/join` acessível por jogadores.

**Fluxo:**
1. Jogador digita o código de 6 caracteres (ou acessa via link direto)
2. Sistema exibe o nome da sessão e as 4 lojas disponíveis
3. Jogador escolhe a loja e o papel dentro dela
4. Validação: papel já ocupado fica desabilitado com tooltip explicativo
5. Após confirmar: redireciona para `/store/:id/plan`

### Critérios de aceite
- [ ] Código inválido exibe erro claro
- [ ] Papéis já ocupados ficam desabilitados
- [ ] Não permite entrar em duas lojas da mesma sessão
- [ ] Redirect para o PO após confirmar papel

---

## Ordem de execução sugerida

```
TASK-07 (schema)
    └── TASK-08 (CRUD sessão)
          └── TASK-09 (lojas + jogadores)
                ├── TASK-10 (dashboard facilitador)
                └── TASK-11 (entrada jogador)
```

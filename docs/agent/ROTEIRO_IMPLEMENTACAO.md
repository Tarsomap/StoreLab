# Roteiro de Implementação — Claude Code

> Use este documento como guia sequencial no Claude Code.
> Cada fase é um prompt que você cola no terminal do Claude Code.
> Após cada fase: `git add . && git commit -m "feat(módulo): descrição"` e teste.

---

## Fase 0 — Base (PrismaService + Seed fix) ⏱️ 15 min

```
Leia docs/agent/plan.md e docs/agent/spec.md.

Crie src/common/prisma.service.ts com PrismaService injetável (extends PrismaClient, implements OnModuleInit).
Crie src/common/common.module.ts exportando PrismaService como global.
Atualize app.module.ts para importar CommonModule.
Corrija o seed.ts: a chamada main() no final está com sintaxe quebrada — o .catch está solto.
Rode: npx prisma db seed para popular categorias e CAPEX options.
Rode: npm run start:dev para verificar que o app sobe sem erros.
```

---

## Fase 1 — Auth (US-01, US-02) ⏱️ 1h

```
Leia docs/agent/plan.md seção Auth e os contratos REST.

Implemente o módulo auth/ completo:
1. DTOs: RegisterDto (name, email, password min 8), LoginDto (email, password), RefreshDto
2. AuthService: register (hash com bcrypt), login (valida + gera JWT + refreshToken), refresh
3. AuthController: POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh
4. JwtStrategy + JwtAuthGuard
5. RolesGuard com decorator @Roles()
6. CurrentUser decorator para extrair user do request

Regras:
- Senha hasheada com bcrypt (nunca plain text)
- JWT expira em 1h, refresh token em 7d
- refreshTokenHash armazenado no User (hasheado)
- Retornar { token, refreshToken, user: { id, name, email, role } }
- Registrar como PLAYER por padrão; criar rota separada ou flag para FACILITATOR
```

---

## Fase 2 — Users + Sessions + Stores (US-03 a US-06) ⏱️ 1.5h

```
Leia docs/agent/plan.md seções Sessions e Stores.

1. UsersModule: UsersService com findById, findByEmail (usado pelo auth)

2. SessionsModule:
   - CreateSessionDto: name, initialCash (default 700000), totalDemand, categoryConfigs[]
   - SessionsService: create (só FACILITATOR), findById, advanceStatus (state machine), getByFacilitator
   - SessionsController: POST /api/sessions, GET /api/sessions/:id, PATCH /api/sessions/:id/advance
   - Gerar invite code de 6 chars por sessão (ou por loja)
   - State machine: SETUP → ROUND_1_CONFIG → ROUND_1 → RECONFIGURATION → ROUND_2 → ROUND_3 → FINISHED

3. StoresModule:
   - StoresService: create (até 4 por sessão), join (jogador entra via accessCode e escolhe papel), getMembers
   - StoresController: POST /api/stores, POST /api/stores/join, GET /api/stores/:id/members
   - Validações: máximo 5 papéis por loja, papel único, accessCode único
```

---

## Fase 3 — Plano Operacional (US-10 a US-16) ⏱️ 1.5h

```
Leia docs/agent/plan.md seção Plans e spec.md seção PO.

PlansModule:
- Criar OperationalPlan por loja e configVersion (1 ou 2)
- Endpoints para cada tipo de decisão:
  PUT /api/plans/:planId/category-decision (stockPurchased em unidades, priceMargin)
  PUT /api/plans/:planId/capex-decision (capexOptionId, implemented: boolean)
  PUT /api/plans/:planId/workforce (cashierOperators 0-10, serviceOperators 0-5)
  POST /api/plans/:planId/confirm (só STORE_MANAGER, requer quiz respondido)
- Calcular cashUsed = Σ(stockPurchased × unitCost) + Σ(capex.acquisitionCost se implemented)
- Calcular projectedEbitda em tempo real (simplificado)
- Validações: cashUsed não pode exceder caixa sem aplicar juros, mas pode exceder (juros aplicados)
- configVersion 2: só pode usar caixa não utilizado + CAPEX não implementado da versão 1
```

---

## Fase 4 — Quiz (spec em docs/agent/QUIZ.md) ⏱️ 1h

```
Leia docs/agent/QUIZ.md completamente.

QuizModule:
- Facilitador cria perguntas por sessão/rodada: POST /api/quiz/questions
- Jogador responde: POST /api/quiz/answers
- Consolidação: score da loja = média dos membros que responderam
- QuizAnswer (consolidado por loja) é lido pelo CsatService
- Endpoints: CRUD de questions, submit answers, get store score
```

---

## Fase 5 — Motor de Cálculo (US-17 a US-21) ⏱️ 2h

```
Leia docs/agent/plan.md seção Engine e spec.md seção Motor de Cálculo.
Leia o arquivo .claude/rules/engine.md para as fórmulas exatas.

Implementar na ordem:
1. constants.ts — todas as constantes centralizadas
2. interfaces/ — EbitdaInput, EbitdaBreakdown, DemandResult, SlaResult
3. csat.service.ts — CSAT = (ops/10) × quizScore
4. demand.service.ts — ranking 1-4, demand share, demanda absoluta
5. shrinkage.service.ts — quebras e aging (só rodada 3)
6. financial.service.ts — EBITDA completo com todos os componentes
7. sla.service.ts — eventos determinísticos por CAPEX não implementado
8. engine.service.ts — orquestrador runRound()

Cada serviço deve ter testes unitários em __tests__/.
Cobertura mínima: 80%.
```

---

## Fase 6 — Resultados e WebSocket (US-23 a US-25) ⏱️ 1h

```
ResultsModule:
- ResultsService: persistir RoundResult, buscar por sessão/rodada, calcular ranking
- ResultsController: GET /api/results/:sessionId, GET /api/results/:sessionId/ranking

GatewayModule:
- Socket.io gateway com rooms por sessão e por loja
- Eventos: po:updated, round:started, round:results, session:finished, sla:event
- Autenticação via JWT no handshake
```

---

## Fase 7 — Transfer (US-22) ⏱️ 30min

```
No SessionsModule ou StoresModule:
- POST /api/sessions/:id/transfers
- Validações: máx 2 por loja, STORE_MANAGER imovível, mesmo papel não duplica no destino
- Atualiza StoreMember + registra PlayerTransfer
- Só durante RECONFIGURATION
```

---

## Fase 8 — Frontend Auth + Dashboard ⏱️ 2h

```
cd frontend && npm install

Implementar:
1. src/lib/api.ts — fetch wrapper com token auto-refresh
2. src/stores/authStore.ts — Zustand: token, user, login(), logout()
3. /login — formulário email + senha
4. /register — formulário nome + email + senha
5. /dashboard — (facilitador) lista sessões, botão criar sessão
6. /join — (jogador) inserir código de acesso, escolher papel
7. Middleware de proteção de rotas
```

---

## Fase 9 — Frontend PO + Quiz + Results ⏱️ 3h

```
1. /store/[storeId]/plan — formulário PO dividido por papel
   - Tab por área: Estoque, Pricing, Operadores, CAPEX
   - Caixa disponível e EBITDA projetado atualizando em tempo real
   - Botão confirmar (só STORE_MANAGER)

2. /store/[storeId]/quiz — tela de perguntas
   - Renderizar opções, marcar resposta, submeter

3. /session/[id]/results — ranking + breakdown
   - Tabela com posição, loja, %EBITDA
   - Breakdown expandível por loja
```

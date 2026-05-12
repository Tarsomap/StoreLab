# Prompt v2 — Refactor Frontend por Features (StoreLab)

> **⚠️ Esta é a v2**. Substitui a v1 após análise do baseline real.
>
> **Mudança principal**: escopo expandido de **4 features / 3 sessões** para **6 features / 4 sessões**, porque o baseline revelou 9 pages acima de 250 linhas (e não ~6 como projetado). Incluídas as features `results` e `quiz` que haviam ficado de fora.
>
> **Contexto**: Análise via `code-review-graph` identificou acoplamento alto entre `plan-handle → lib-api` (36 edges) e `plan-handle → ui-session` (30 edges) no frontend. Coesão baixa (0.03–0.11) indica agrupamento artificial por tipo em vez de por feature. Baseline confirmou 31 chamadas `api.*` diretas em `app/` e 9 pages acima de 250 linhas.
>
> **Objetivo**: Reorganizar o `frontend/src` por domínio (feature-colocation), extrair hooks de feature para encapsular chamadas REST/WebSocket, e quebrar `page.tsx` monolíticas em componentes colocalizados — **sem alterar comportamento, contratos de API ou o backend**.

---

## 📊 Baseline Capturado (referência)

| Métrica | Valor baseline | Meta final |
|---|---|---|
| Rotas (`page.tsx`) | 11 | 11 (inalterado) |
| Endpoints REST consumidos | 15 | 15 (inalterado) |
| Eventos WebSocket | 6 | 6 (inalterado) |
| Chamadas `api.*` diretas em `app/` | **31** | **<5** |
| Pages >250 linhas | **9 de 11** | **0** |
| Bundle size | 1.8M | 1.7–1.9M |

### Pages gordas e feature de destino

| Linhas | Page | Feature |
|---|---|---|
| 1380 🔥 | `store/[storeId]/plan/page.tsx` | `plan` (Sessão 1) |
| 868 🔥 | `dashboard/page.tsx` | `session` (Sessão 2) |
| 854 🔥 | `session/[id]/results/page.tsx` | `results` (Sessão 3) |
| 807 🔥 | `dashboard/session/[id]/page.tsx` | `session` (Sessão 2) |
| 426 | `join/page.tsx` | `auth` (Sessão 2) |
| 393 | `dashboard/session/[id]/quiz/page.tsx` | `quiz` (Sessão 3) |
| 326 | `dashboard/session/[id]/transfers/page.tsx` | `store` (Sessão 4) |
| 317 | `(auth)/register/page.tsx` | `auth` (Sessão 2) |
| 298 | `store/[storeId]/quiz/page.tsx` | `quiz` (Sessão 3) |

---

## 🚫 Restrições Absolutas (NÃO FAZER)

1. **NÃO modificar o diretório `backend/`** — especialmente `backend/src/engine/` (regra em `.claude/rules/engine.md`)
2. **NÃO alterar contratos REST** (rotas, payloads, status codes) — o backend permanece imutável
3. **NÃO alterar eventos WebSocket** (`plan:updated`, `join:store`, etc.)
4. **NÃO mexer em `frontend/src/lib/utils.ts` (cn)**, `format-brl.ts`, `api.ts` — são utilitários transversais legítimos
5. **NÃO mexer em `frontend/src/components/ui/*`** — são primitives do shadcn/ui
6. **NÃO mudar o design visual** — Fase B.1 (redesign) foi concluída e aprovada em 29/03
7. **NÃO renomear rotas do App Router** — URLs devem permanecer idênticas
8. **NÃO adicionar dependências novas** — use o que já está no `package.json`
9. **Sempre executar comandos dos scripts de validação via `bash`** (WSL ou Git Bash) — não PowerShell

---

## 🎯 Escopo do Refactor

### Estrutura-alvo a criar em `frontend/src/`

```
frontend/src/
├── app/                          # (inalterado — só as páginas ficam finas)
├── components/
│   ├── ui/                       # (inalterado — shadcn primitives)
│   └── shared/                   # (NOVO — componentes usados por 2+ features)
├── features/                     # 🆕 NOVA PASTA
│   ├── plan/
│   │   ├── components/
│   │   ├── hooks/                # usePlan, useStockAvailability, useRealtimePlan
│   │   ├── lib/                  # buildDre, buildCatRows, configVersionFromStatus
│   │   └── types.ts
│   ├── session/
│   │   ├── components/           # PhaseStepper, ContextualActions, StoreCard, SessionQuizProgress
│   │   ├── hooks/                # useSession, useSessionStatus, useAdvancePhase
│   │   ├── lib/                  # PHASE_LABEL, PHASE_STEPS
│   │   └── types.ts
│   ├── auth/
│   │   ├── components/           # LoginForm, RegisterForm, OtpJoin, PasswordStrength
│   │   ├── hooks/                # useLogin, useRegister, useJoinSession
│   │   └── types.ts
│   ├── results/                  # 🆕 v2
│   │   ├── components/           # PodiumChart, RankingTable, RoundBreakdown, DreDetailCard
│   │   ├── hooks/                # useResults, useFinalRanking, useRoundBreakdown
│   │   ├── lib/                  # computePodiumOrder, formatRankingBadge
│   │   └── types.ts
│   ├── quiz/                     # 🆕 v2
│   │   ├── components/
│   │   │   ├── facilitator/      # QuestionEditor, QuestionsList, ProgressBoard
│   │   │   └── player/           # QuestionRunner, AnswerFeedback, ScoreCard
│   │   ├── hooks/                # useQuiz, useQuestions, useSubmitAnswer, useQuizProgress
│   │   └── types.ts
│   └── store/
│       ├── components/           # StoreMembersList, TransferPlayerDialog
│       ├── hooks/                # useStore, useStoreMembers, useTransfer
│       └── types.ts
├── hooks/                        # (apenas hooks globais: useSocket, useAnimatedValue)
├── lib/                          # (inalterado)
└── stores/                       # (inalterado: Zustand)
```

### Princípios de Migração

- **Feature-hook encapsula fetch**: páginas não chamam mais `api.get('/plans/...')` direto; chamam `usePlan(storeId)` que retorna `{ data, isLoading, error, refetch }`.
- **Tipos movem junto com a feature**: interfaces de domínio saem de `page.tsx` e vão para `features/[nome]/types.ts`.
- **Helpers puros migram com o domínio**: funções como `buildDre`, `computePodiumOrder` vão para `features/[nome]/lib/`.
- **Componentes internos da page**: sub-componentes declarados dentro de `page.tsx` viram arquivos em `features/[nome]/components/`.
- **Página final = orquestração fina**: `page.tsx` deve ficar **sempre abaixo de 250 linhas**, apenas compondo componentes da feature.

---

## 📋 Plano de Execução (4 Sessões)

### Sessão 1 — Feature `plan` (a mais complexa, 1380 linhas)

**⏱ ~2.5h de Claude Code** · branch: `refactor/frontend-feature-plan`

1. Leia por completo `frontend/src/app/store/[storeId]/plan/page.tsx` e liste:
   - Todos os `interface` / `type` declarados
   - Todos os helpers puros (`buildCatRows`, `buildDre`, `configVersionFromStatus`, `brl`, `pct`, `num`)
   - Todas as chamadas `api.get/post/patch`
   - Todos os sub-componentes React definidos no arquivo
2. Crie `features/plan/types.ts` movendo as interfaces de domínio do PO.
3. Crie `features/plan/lib/plan-math.ts` movendo os helpers puros.
4. Crie `features/plan/hooks/use-plan.ts`:
   ```ts
   export function usePlan(storeId: string) {
     // GET /plans/store/:storeId encapsulado
     // retorna { plan, financials, isLoading, error, refetch }
   }
   ```
5. Crie `features/plan/hooks/use-realtime-plan.ts` encapsulando `useSocket` + join:store + listener de `plan:updated`.
6. Crie `features/plan/hooks/use-stock-availability.ts`.
7. Extraia sub-componentes para `features/plan/components/`:
   - `PlanMetricCards.tsx` (EBITDA, caixa, CSAT)
   - `PlanCategoryTable.tsx`
   - `PlanCapexList.tsx`
   - `PlanDreSummary.tsx`
   - `PlanConfirmButton.tsx`
8. Reescreva `plan/page.tsx` usando apenas os novos imports — **meta: <250 linhas**.
9. Rode `bash ./refactor-check build` e `bash ./refactor-check validate` — deve passar sem erros.

### Sessão 2 — Features `session` + `auth`

**⏱ ~1.5h** · branch: `refactor/frontend-feature-session-auth`

Pages alvo: `dashboard/page.tsx` (868), `dashboard/session/[id]/page.tsx` (807), `join/page.tsx` (426), `(auth)/register/page.tsx` (317).

1. **Feature `session`**:
   - Extraia `PhaseStepper`, `ContextualActions`, `SessionQuizProgress` para `features/session/components/`.
   - Crie hooks: `useSession(id)`, `useSessionStatus(id)`, `useAdvancePhase`, `useExecuteRound`.
   - Mova `PHASE_LABEL`, `PHASE_STEPS` e tipos para `features/session/lib/` e `features/session/types.ts`.
   - Para `dashboard/page.tsx`: extraia lógica de listagem/criação para `features/session/hooks/use-sessions-list.ts` e componentes `SessionListTable`, `CreateSessionDialog` em `features/session/components/`.
   - Finalize todas as 3 pages (`dashboard`, `session/[id]`, `transfers`) — **cada uma <250 linhas**.
2. **Feature `auth`**:
   - Mova formulários de login/register/join para `features/auth/components/`.
   - Crie `useLogin`, `useRegister`, `useJoinSession`.
   - Mantenha o split-layout 40/60 e a segmented control da Fase B.1.
3. Rode `bash ./refactor-check build` e `bash ./refactor-check validate`.

### Sessão 3 — Features `results` + `quiz` 🆕

**⏱ ~1.5h** · branch: `refactor/frontend-feature-results-quiz`

Pages alvo: `session/[id]/results/page.tsx` (854), `dashboard/session/[id]/quiz/page.tsx` (393), `store/[storeId]/quiz/page.tsx` (298).

1. **Feature `results`**:
   - Extraia o pódio olímpico (layout 2º-1º-3º da Fase B.1) para `features/results/components/PodiumChart.tsx`.
   - Extraia tabela de ranking com medalhas para `RankingTable.tsx`.
   - Extraia breakdown DRE + Caixa lado a lado para `RoundBreakdown.tsx`.
   - Extraia detalhamento de rodada para `RoundDetailPanel.tsx`.
   - Crie hooks: `useResults(sessionId)`, `useFinalRanking(sessionId)`, `useRoundBreakdown(sessionId, round)`.
   - Helpers puros: `computePodiumOrder`, `formatRankingBadge`, `computePercentDelta` → `features/results/lib/results-math.ts`.
   - **IMPORTANTE**: preserve rigorosamente o visual do pódio — Fase B.1 é sagrada.
2. **Feature `quiz`** (duas faces):
   - **Facilitador** (`dashboard/session/[id]/quiz/page.tsx`): CRUD de perguntas. Extraia `QuestionEditor`, `QuestionsList`, `ProgressBoard` para `features/quiz/components/facilitator/`.
   - **Jogador** (`store/[storeId]/quiz/page.tsx`): responder perguntas antes de confirmar PO. Extraia `QuestionRunner`, `AnswerFeedback`, `ScoreCard` para `features/quiz/components/player/`.
   - Hooks compartilhados: `useQuiz(sessionId)`, `useQuestions(sessionId)`, `useSubmitAnswer`, `useQuizProgress(sessionId)`.
   - Tipos compartilhados em `features/quiz/types.ts`.
3. Rode `bash ./refactor-check build` e `bash ./refactor-check validate`.

### Sessão 4 — Feature `store` + cleanup + report final

**⏱ ~1h** · branch: `refactor/frontend-feature-store-cleanup`

Page alvo: `dashboard/session/[id]/transfers/page.tsx` (326).

1. **Feature `store`**: migre componentes relacionados a loja/membros/transferências.
   - `StoreMembersList`, `TransferPlayerDialog`, `RoleBadge` → `features/store/components/`.
   - Hooks: `useStore(storeId)`, `useStoreMembers(storeId)`, `useTransfer(sessionId)`.
2. **Codemod de imports**: garanta que nenhum arquivo fora de `features/[X]/` referencia tipos privados da feature `[X]`.
3. **Limpeza**: remova código morto (imports não usados, tipos duplicados, arquivos órfãos).
4. **Validação completa**:
   ```bash
   bash ./refactor-check full     # build + validate + smoke
   bash ./refactor-check report
   ```

---

## ✅ Validação Automática (Obrigatória ao fim de cada sessão)

Execute **na ordem** e só avance se tudo passar:

```bash
# Dentro do WSL/Git Bash:
bash ./refactor-check build       # lint + typecheck + next build
bash ./refactor-check validate    # compara snapshot com baseline
```

### Meta por sessão

| Sessão | Pages refatoradas | `api.*` em `app/` após |
|---|---|---|
| Após S1 | 1 (plan) | ≤ 22 |
| Após S2 | 5 (plan + session×2 + auth×2) | ≤ 12 |
| Após S3 | 8 (+ results + quiz×2) | ≤ 5 |
| Após S4 | 9 (+ transfers) | **0** (meta final) |

### Checklist funcional por sessão

**Após Sessão 1** — PO:
- [ ] 2 abas → editar `stockPurchased` em uma reflete na outra (WebSocket)
- [ ] DRE recalcula localmente ao editar

**Após Sessão 2** — Sessão + Auth:
- [ ] Login demo funciona
- [ ] Criar sessão → criar lojas → avançar fase
- [ ] Join com OTP de 6 inputs

**Após Sessão 3** — Results + Quiz:
- [ ] Facilitador cria pergunta no quiz
- [ ] Jogador responde e vê feedback
- [ ] Após executar rodada, pódio olímpico renderiza corretamente
- [ ] Breakdown por rodada mostra DRE + Caixa lado a lado

**Após Sessão 4** — Store + final:
- [ ] Transferência entre lojas na fase RECONFIGURATION funciona
- [ ] Smoke test completo passa (`bash ./refactor-check smoke`)

---

## 🎯 Critérios de Aceitação Finais (Pós-Sessão 4)

| # | Critério | Como verificar |
|---|---|---|
| 1 | `npm run build` limpo | Next build sem warnings novos |
| 2 | `npm run lint` limpo | Zero erros |
| 3 | `npx tsc --noEmit` limpo | Tipagem 100% |
| 4 | **Nenhuma `page.tsx` com mais de 250 linhas** | `find frontend/src/app -name "page.tsx" -exec wc -l {} +` |
| 5 | Páginas importam apenas de `features/*`, `components/ui/*`, `lib/*`, `hooks/*` | `grep -r "api.get\|api.post" frontend/src/app/` retorna vazio |
| 6 | Todos os fluxos manuais do checklist funcionam | Validação manual com seed demo |
| 7 | WebSocket `plan:updated` funciona entre abas | Teste com 2 abas |
| 8 | Backend não foi tocado | `git diff --stat main -- backend/` vazio |
| 9 | Engine intacto | `cd backend && npm run test` — todos os 72 testes verdes |
| 10 | Rotas da aplicação inalteradas | URL bar igual antes e depois |

---

## 📝 Convenções de PR (Conforme `CONTRIBUTING.md`)

- **Uma branch por sessão**:
  - `refactor/frontend-feature-plan`
  - `refactor/frontend-feature-session-auth`
  - `refactor/frontend-feature-results-quiz`
  - `refactor/frontend-feature-store-cleanup`
- **Commits**: use `refactor(frontend)` como escopo.
- **Tamanho do PR**: a Sessão 1 (plan com 1380 linhas) certamente excede 400 linhas — documente no corpo do PR. Demais PRs devem caber.
- **Template do PR**: use `PR-TEMPLATE-REFACTOR-v2.md`.

---

## 🧠 Diretrizes para o Agente (Claude Code)

1. **Antes de mover qualquer arquivo**: leia o arquivo inteiro e mapeie todas as referências (imports entrantes e saintes).
2. **Depois de cada mudança**: rode `npm run build` antes de continuar — não acumule erros.
3. **Se algo quebrar de forma não óbvia**: pare, explique o que falhou e pergunte antes de "tentar consertar".
4. **Se encontrar código morto durante o refactor**: liste para aprovação antes de remover.
5. **Preserve todos os comentários JSDoc** existentes — o squad usa como documentação viva.
6. **Ao criar feature-hooks**: devolva shape estável `{ data, isLoading, error, refetch }` para simplificar consumo.
7. **Não "melhorar" código de passagem**: refactor = mesmo comportamento. Se ver um bug, anote e reporte; não corrija no mesmo PR.
8. **Comandos shell**: sempre via `bash ./refactor-check ...` (WSL). Nunca via PowerShell.

---

## 🆘 Rollback

Se algo der errado em qualquer sessão:

```bash
git checkout main
git branch -D refactor/frontend-feature-<nome>
```

Como backend não foi tocado, rollback é imediato e seguro. Nenhuma migration Prisma envolvida, nenhuma alteração de schema.

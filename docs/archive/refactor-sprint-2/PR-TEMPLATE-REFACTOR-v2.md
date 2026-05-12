# Template de PR v2 — Refactor Frontend por Features (4 PRs)

> **Uso**: copie o bloco apropriado conforme o PR que está abrindo.
> - **Variante A — PR Intermediário** (PR-1, PR-2, PR-3)
> - **Variante B — PR Final** (PR-4, inclui relatório consolidado)
>
> Preencha tudo que estiver em `[COLCHETES]`.

---

## 🅰️ Variante A — PR Intermediário (PR-1, PR-2, PR-3)

```markdown
# refactor(frontend): [ESCOPO, ex: criar feature plan com hooks colocalizados]

## 📌 Contexto

Este PR faz parte do **refactor estrutural do frontend** para resolver o acoplamento alto e baixa coesão identificados pelo `code-review-graph`:

- `plan-handle → lib-api`: 36 edges (meta: <15)
- `plan-handle → ui-session`: 30 edges (meta: <15)
- Coesão do frontend: 0.03–0.11 (meta: ≥0.30 por feature)
- 31 chamadas `api.*` diretas em `app/` (meta: 0 ao fim)
- 9 pages acima de 250 linhas (meta: 0 ao fim)

**Este é o PR [1|2|3] de 4.** Trilha em `docs/refactor/REFACTOR-FRONTEND-FEATURES-v2.md`.

## 🎯 Escopo deste PR

Migração das features **`[plan | session+auth | results+quiz]`** para `frontend/src/features/*`:

- [ ] Tipos de domínio movidos para `features/[nome]/types.ts`
- [ ] Helpers puros movidos para `features/[nome]/lib/*`
- [ ] Feature-hooks criados em `features/[nome]/hooks/*`
- [ ] Componentes internos de `page.tsx` extraídos para `features/[nome]/components/*`
- [ ] Pages desta feature reduzidas a orquestração fina (<250 linhas)

## 🚫 O que este PR **NÃO** faz

- ❌ Não altera `backend/` (hash SHA256 idêntico ao baseline)
- ❌ Não altera contratos REST (rotas, payloads, status codes)
- ❌ Não altera eventos WebSocket
- ❌ Não altera `lib/utils.ts`, `lib/format-brl.ts`, `lib/api.ts`
- ❌ Não altera `components/ui/*` (shadcn primitives)
- ❌ Não altera rotas do App Router (URLs idênticas)
- ❌ Não adiciona dependências novas
- ❌ Não muda comportamento visual (Fase B.1 preservada)

## ✅ Resultado da Validação Automatizada

Executado via `bash ./refactor-check validate` — relatório completo em `.refactor-check/reports/diff-[TIMESTAMP].md`.

### Travas Críticas

| # | Critério | Status |
|---|---|---|
| 1 | Backend hash inalterado | ✅ |
| 2 | Engine checksums inalterados (regra `.claude/rules/engine.md`) | ✅ |
| 3 | Nenhuma rota do App Router removida | ✅ |
| 4 | Nenhum endpoint REST sumiu do código | ✅ |
| 5 | Nenhum evento WebSocket sumiu | ✅ |

### Métricas de Ganho (meta progressiva)

| Métrica | Baseline (main) | Depois deste PR | Meta final (PR-4) |
|---|---|---|---|
| Chamadas `api.*` diretas em `app/` | 31 | `[M]` | 0 |
| Pages >250 linhas | 9 | `[X]` | 0 |
| Maior `page.tsx` (linhas) | 1380 | `[Y]` | <250 |
| Bundle size | 1.8M | `[Z]` | ≈1.8M |

### Tripé Lint + TypeCheck + Build

- [ ] `npm run lint` — 0 erros, 0 warnings novos
- [ ] `npx tsc --noEmit` — 0 erros
- [ ] `npm run build` — build Next.js limpo

## 🧪 Como Testar

### Validação automatizada (reproduzir localmente)

```bash
git checkout [nome-desta-branch]
bash ./refactor-check build
bash ./refactor-check validate
```

Todas as checks devem retornar ✅.

### Validação manual — fluxo da feature

Com stack local rodando (`npm run seed:demo` no backend, `npm run dev` no frontend):

- [ ] Login com `demo-facilitador@squad14.com`
- [ ] [PREENCHER passos específicos da feature do PR]

**Para PR-1 (plan)**:
- [ ] Abrir PO em `/store/[storeId]/plan`
- [ ] Editar `stockPurchased` em uma categoria
- [ ] Abrir outra aba com jogador diferente da mesma loja
- [ ] Confirmar que alteração propaga via WebSocket sem refresh
- [ ] Confirmar PO → status atualiza em tempo real

**Para PR-2 (session+auth)**:
- [ ] Registro com força de senha e segmented control Jogador/Facilitador
- [ ] Join com OTP de 6 inputs
- [ ] Criar sessão → lojas → avançar `SETUP → ROUND_1_CONFIG`
- [ ] Dashboard de sessão mostra stepper e ações contextuais

**Para PR-3 (results+quiz)**:
- [ ] Facilitador cria perguntas de quiz
- [ ] Jogador responde quiz → score aparece no PO
- [ ] Executar rodada → pódio olímpico renderiza (2º-1º-3º)
- [ ] Breakdown mostra DRE + Caixa lado a lado

## 📂 Arquivos Criados / Movidos

<details>
<summary>Clique para expandir</summary>

### Criados em `features/[nome]/`
- `features/[nome]/types.ts`
- `features/[nome]/lib/[arquivos].ts`
- `features/[nome]/hooks/use-[nome].ts`
- `features/[nome]/components/[Componentes].tsx`

### Modificados
- `app/[rota]/page.tsx` — reduzido de `[X]` para `[Y]` linhas

### Removidos
- N/A (nada foi deletado, apenas movido)

</details>

## 📏 Tamanho do PR

- **Linhas adicionadas**: `[X]`
- **Linhas removidas**: `[Y]`
- **Arquivos alterados**: `[Z]`

> Conforme `CONTRIBUTING.md`, PRs acima de 400 linhas justificam.
> `[PR-1 EXCEDE o limite porque a page original tinha 1380 linhas — refactor estrutural move código em bloco, o conteúdo é o mesmo apenas reorganizado]`
> `[PR-2/PR-3 está dentro do limite]`

## 🆘 Rollback

```bash
git revert [hash-deste-merge]
```

Backend intocado, zero migrations, zero mudanças de schema.

## 🔗 Referências

- Documento guia: `docs/refactor/REFACTOR-FRONTEND-FEATURES-v2.md`
- Documento de validação: `docs/refactor/REFACTOR-VALIDATION.md`
- Relatório original: `code-review-graph` executado em `[data]`
- PR anterior: `[link ou N/A]`

## ☑️ Checklist

- [ ] Commits seguem Conventional Commits (`refactor(frontend): ...`)
- [ ] Sem `any` solto nas interfaces
- [ ] `npm run lint` passando
- [ ] Branch nomeada corretamente
- [ ] Revisado por pelo menos 1 membro do squad
- [ ] Será mergeado via **Squash and Merge**
- [ ] Próximas branches do squad foram comunicadas sobre possíveis conflitos
```

---

## 🅱️ Variante B — PR FINAL (PR-4)

```markdown
# refactor(frontend): finalizar migração para features/ + cleanup + relatório

## 📌 Contexto

**PR 4 de 4 — FINAL** da trilha de refactor estrutural. Junta a feature `store`, executa codemod final de imports e remove código morto.

Trilha completa:
- PR-1 (#[N]) — feature `plan` (1380 → <250 linhas)
- PR-2 (#[N]) — features `session` + `auth` (3 pages gordas)
- PR-3 (#[N]) — features `results` + `quiz` (3 pages gordas)
- PR-4 (este) — feature `store` + cleanup + relatório consolidado

## 🎯 Escopo deste PR

- [ ] Migração da feature `store` para `features/store/`
- [ ] Codemod de imports: nenhum arquivo fora de `features/[X]/` referencia tipos privados de `[X]`
- [ ] Remoção de código morto identificado nas 4 sessões
- [ ] Consolidação do relatório final em `.refactor-check/REPORT.md`

## 🚫 Restrições mantidas

Mesmas dos PRs anteriores.

## 📊 RELATÓRIO FINAL DO REFACTOR

### Comparação `code-review-graph` — Antes vs Depois

#### Backend (deve estar IDÊNTICO ao baseline)

| Módulo | Nós antes | Nós depois | Coesão antes | Coesão depois |
|---|---|---|---|---|
| `tests-when` (engine) | 126 | `[?]` | 0.31 | `[?]` |
| `quiz-quiz` | 41 | `[?]` | 0.35 | `[?]` |
| `plans-decision` | 28 | `[?]` | 0.43 | `[?]` |
| `auth-auth` | 23 | `[?]` | 0.35 | `[?]` |
| `sessions-sessions` | 22 | `[?]` | 0.39 | `[?]` |

> **Expectativa**: valores idênticos em ambas colunas.

#### Frontend — Metas do Refactor

| Métrica | Antes | Depois | Meta | Status |
|---|---|---|---|---|
| Coesão `features/plan` | 0.11 | `[?]` | ≥0.35 | `[✅/❌]` |
| Coesão `features/session` | 0.08 | `[?]` | ≥0.30 | `[✅/❌]` |
| Coesão `features/auth` | — | `[?]` | ≥0.30 | `[✅/❌]` |
| Coesão `features/results` | — | `[?]` | ≥0.30 | `[✅/❌]` |
| Coesão `features/quiz` | — | `[?]` | ≥0.30 | `[✅/❌]` |
| Coesão `features/store` | — | `[?]` | ≥0.30 | `[✅/❌]` |
| Edges `plan → lib-api` | 36 | `[?]` | <15 | `[✅/❌]` |
| Edges `plan → ui-session` | 30 | `[?]` | <15 | `[✅/❌]` |

### Ganhos Mensuráveis

| Métrica | Antes | Depois | Variação |
|---|---|---|---|
| Chamadas `api.*` diretas em `app/` | 31 | `[Y]` | `[-Z%]` |
| Pages >250 linhas | 9 de 11 | 0 | `-100%` |
| Maior `page.tsx` | 1380 | `[Y]` | `[-Z linhas]` |
| Média de linhas por `page.tsx` | `[X]` | `[Y]` | `[-Z linhas]` |
| Feature-hooks criados | 0 | `[N]` | `+[N]` |
| Arquivos em `features/` | 0 | `[N]` | `+[N]` |
| Bundle size (`.next/static`) | 1.8M | `[Y]` | `[+-W%]` |

### Ciclo Completo de Validação

| Check | Status | Evidência |
|---|---|---|
| Engine intocado (checksum MD5) | ✅ | diff vazio |
| Backend intocado (hash SHA256) | ✅ | `git diff --stat main -- backend/` vazio |
| Todos os 72 testes do engine passam | ✅ | `cd backend && npm run test` |
| Nenhuma rota removida | ✅ | Seção 3 do relatório |
| Nenhum endpoint REST perdido | ✅ | Seção 4 do relatório |
| Nenhum evento WebSocket perdido | ✅ | Seção 5 do relatório |
| Todas as `page.tsx` <250 linhas | ✅ | Seção 6 do relatório |
| 0 chamadas `api.*` em `app/` | ✅ | Seção 7 do relatório |
| Smoke test runtime (curl) | ✅ | `bash ./refactor-check smoke` |
| WebSocket entre abas (manual) | ✅ | Validado com 2 jogadores demo |

## 🧪 Como Testar o Resultado Completo

```bash
git checkout refactor/frontend-feature-store-cleanup
cd backend && npm run seed:demo && npm run start:dev &
cd frontend && npm run build && npm run start &
bash ./refactor-check full   # build + validate + smoke
```

### Fluxo funcional completo

- [ ] `/login` com user demo → dashboard carrega
- [ ] Criar sessão nova → lojas → avançar para `ROUND_1_CONFIG`
- [ ] Jogadores logam via `/join` com OTP → entram na loja
- [ ] PO colaborativo: 2 abas + edição propaga via WebSocket
- [ ] Quiz: criação (facilitador) → resposta (jogador) → impacto no CSAT
- [ ] Executar rodada → pódio olímpico + ranking
- [ ] Transferências entre rodadas → reconfiguração funciona
- [ ] Rodada final → tela de resultado (Fase B.1 preservada)

## 📂 Estrutura Final

```
frontend/src/
├── app/                    # Apenas orquestração (todas <250 linhas)
├── components/
│   ├── ui/                 # shadcn primitives (inalterado)
│   └── shared/             # componentes multi-feature
├── features/               # 🆕 core do refactor
│   ├── plan/
│   ├── session/
│   ├── auth/
│   ├── results/
│   ├── quiz/
│   └── store/
├── hooks/                  # Hooks globais (useSocket, useAnimatedValue)
├── lib/                    # api.ts, utils.ts, format-brl.ts (inalterado)
└── stores/                 # Zustand (inalterado)
```

## 🎓 Aprendizados para o Squad

1. **Feature-colocation** reduziu o tempo de navegação: tudo sobre uma feature está junto
2. **Feature-hooks** são o ponto único de integração com API/WebSocket
3. **Baseline automatizado** (`code-review-graph` + `refactor-check`) deve virar padrão
4. **Restrição estrita ao engine** (regra `.claude/rules/engine.md`) comprovadamente protegeu 100% da cobertura

## 📣 Próximos Passos (pós-merge)

1. Avisar o squad para rodar `git rebase main` em branches abertas
2. Atualizar `docs/agent/plan.md` → "Project Structure" refletindo `features/`
3. Documentar o padrão `features/` em `CONTRIBUTING.md` para PRs futuros

## 🆘 Rollback

```bash
git revert [hash-PR-4]
git revert [hash-PR-3]
git revert [hash-PR-2]
git revert [hash-PR-1]
```

## 🔗 Referências

- `docs/refactor/REFACTOR-FRONTEND-FEATURES-v2.md`
- `docs/refactor/REFACTOR-VALIDATION.md`
- `.refactor-check/REPORT.md` — **anexado a este PR**
- PR-1: #[N] · PR-2: #[N] · PR-3: #[N]

## ☑️ Checklist

- [ ] Commits seguem Conventional Commits
- [ ] `npm run lint` passando
- [ ] Branch nomeada corretamente
- [ ] **`REPORT.md` anexado como arquivo no PR**
- [ ] **Metas de coesão atingidas conforme tabela**
- [ ] **2 aprovações recomendadas (1 squad + 1 mentor)**
- [ ] Será mergeado via **Squash and Merge**
```

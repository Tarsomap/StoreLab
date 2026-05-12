# Prompt — Validação Automatizada do Refactor Frontend (StoreLab)

> **Contexto**: Este prompt é o **par** do `REFACTOR-FRONTEND-FEATURES.md`. Ele é executado em **dois momentos distintos**:
>
> 1. **ANTES** do refactor começar → gera snapshots de baseline (“fotografia” do estado atual)
> 2. **DEPOIS** de cada sessão de refactor → compara contra o baseline e emite veredito PASS/FAIL
>
> **Objetivo**: detectar qualquer regressão de comportamento — chamadas de API perdidas, rotas quebradas, imports pendurados, bundle inflado, engine tocado por acidente — antes de abrir o PR.

---

## 🧭 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│  ETAPA 0 — Setup (uma vez só)                                │
│  └─> cria .refactor-check/scripts/* e .refactor-check/baseline│
│                                                              │
│  ETAPA 1 — Baseline (ANTES do refactor)                      │
│  └─> ./refactor-check baseline                               │
│      gera snapshots em .refactor-check/baseline/*.json       │
│                                                              │
│  [... executa as 3 sessões do REFACTOR-FRONTEND-FEATURES ...] │
│                                                              │
│  ETAPA 2 — Validation (depois de cada sessão)                │
│  └─> ./refactor-check validate                               │
│      compara estado atual com baseline                       │
│                                                              │
│  ETAPA 3 — Smoke Test Runtime (antes de mergear)             │
│  └─> ./refactor-check smoke                                  │
│      sobe stack e testa rotas reais via curl                 │
│                                                              │
│  ETAPA 4 — Relatório final (antes de abrir PR)               │
│  └─> ./refactor-check report                                  │
│      consolida em .refactor-check/REPORT.md                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚫 Restrições (mesmas do refactor)

1. Scripts ficam em `.refactor-check/` na **raiz do repo** (adicione ao `.gitignore` ou commite junto, sua escolha — recomendo commitar para histórico)
2. Nenhum script altera arquivos do projeto — só **lê** e gera artefatos em `.refactor-check/`
3. Não adicione dependências runtime ao `package.json` — use só o que existe + `jq` (via apt)

---

## 📋 ETAPA 0 — Setup dos Scripts

Crie a estrutura:

```bash
mkdir -p .refactor-check/{baseline,current,scripts,reports}
touch .refactor-check/.gitkeep
echo "current/" > .refactor-check/.gitignore   # não commitar snapshots pós-refactor
```

### Script 1: `.refactor-check/scripts/snapshot.sh`

Gera um snapshot do estado do repo. Reutilizado para baseline e current.

```bash
#!/usr/bin/env bash
# Uso: ./snapshot.sh <baseline|current>
set -euo pipefail

MODE="${1:-current}"
OUT=".refactor-check/${MODE}"
mkdir -p "${OUT}"

echo "📸 Gerando snapshot: ${MODE}"

# 1. Lista de rotas do App Router (páginas acessíveis)
find frontend/src/app -name "page.tsx" -type f | sort > "${OUT}/routes.txt"

# 2. Endpoints REST consumidos pelo frontend (todas as strings tipo '/auth/login', '/plans/...', etc)
grep -rhoE "api\.(get|post|patch|put|delete)<[^>]*>\(['\"\`][^'\"\`]+['\"\`]" frontend/src \
  | sed -E "s/.*\(['\"\`]([^'\"\`]+)['\"\`].*/\1/" \
  | sort -u > "${OUT}/api-endpoints.txt"

# 3. Eventos WebSocket emitidos e escutados
grep -rhoE "(socket\.(emit|on)|\.emit|\.on)\(['\"\`][a-zA-Z:_-]+['\"\`]" frontend/src \
  | sed -E "s/.*\(['\"\`]([^'\"\`]+)['\"\`].*/\1/" \
  | sort -u > "${OUT}/ws-events.txt"

# 4. Tamanho de cada page.tsx (detecta "page gorda")
find frontend/src/app -name "page.tsx" -exec wc -l {} + \
  | awk 'NF==2 {print $2"\t"$1}' \
  | grep -v "total" | sort > "${OUT}/page-sizes.tsv"

# 5. Tipos exportados (detecta remoção acidental de API pública)
grep -rhoE "export (type|interface) [A-Z][A-Za-z0-9_]+" frontend/src \
  | awk '{print $3}' | sort -u > "${OUT}/exported-types.txt"

# 6. Hash SHA do diretório backend (deve ser idêntico antes/depois)
find backend/src -type f -name "*.ts" -exec sha256sum {} + \
  | sort -k2 | sha256sum | awk '{print $1}' > "${OUT}/backend-hash.txt"

# 7. Lista de arquivos do engine (não pode mudar)
find backend/src/engine -type f | sort > "${OUT}/engine-files.txt"
md5sum $(find backend/src/engine -type f -name "*.ts" | sort) \
  > "${OUT}/engine-checksums.txt" 2>/dev/null

# 8. Bundle size (next build output)
if [ -d "frontend/.next" ]; then
  du -sh frontend/.next/static 2>/dev/null | awk '{print $1}' > "${OUT}/bundle-size.txt" || echo "N/A" > "${OUT}/bundle-size.txt"
else
  echo "N/A" > "${OUT}/bundle-size.txt"
fi

# 9. Contagem de imports diretos `api.` fora de hooks (métrica do acoplamento alvo)
grep -rE "api\.(get|post|patch|put|delete)" frontend/src/app 2>/dev/null | wc -l > "${OUT}/direct-api-calls-in-pages.txt"

echo "✅ Snapshot ${MODE} salvo em ${OUT}/"
ls -la "${OUT}/"
```

### Script 2: `.refactor-check/scripts/diff.sh`

Compara baseline vs current e emite veredito por critério.

```bash
#!/usr/bin/env bash
# Uso: ./diff.sh
set -uo pipefail

B=".refactor-check/baseline"
C=".refactor-check/current"
R=".refactor-check/reports/diff-$(date +%Y%m%d-%H%M%S).md"
mkdir -p .refactor-check/reports

FAIL=0
pass() { echo "✅ $1" | tee -a "$R"; }
fail() { echo "❌ $1" | tee -a "$R"; FAIL=1; }
warn() { echo "⚠️  $1" | tee -a "$R"; }

echo "# Relatório de Validação — $(date)" > "$R"
echo "" >> "$R"

# 1. BACKEND INTOCADO (crítico)
echo "## 1. Backend intocado" | tee -a "$R"
if diff -q "$B/backend-hash.txt" "$C/backend-hash.txt" > /dev/null; then
  pass "Backend hash idêntico ao baseline — nenhum arquivo backend foi alterado"
else
  fail "BACKEND FOI MODIFICADO. Isso viola a restrição do refactor."
  echo "" >> "$R"; echo "\`\`\`" >> "$R"; diff "$B/backend-hash.txt" "$C/backend-hash.txt" >> "$R"; echo "\`\`\`" >> "$R"
fi

# 2. ENGINE INTOCADO (hiper-crítico — regra .claude/rules/engine.md)
echo "" >> "$R"; echo "## 2. Engine intocado (regra absoluta)" | tee -a "$R"
if diff -q "$B/engine-checksums.txt" "$C/engine-checksums.txt" > /dev/null; then
  pass "Todos os arquivos do engine com checksum idêntico"
else
  fail "ENGINE FOI MODIFICADO — violação de .claude/rules/engine.md"
  diff "$B/engine-checksums.txt" "$C/engine-checksums.txt" >> "$R"
fi

# 3. NENHUMA ROTA FOI REMOVIDA
echo "" >> "$R"; echo "## 3. Rotas do App Router preservadas" | tee -a "$R"
REMOVED_ROUTES=$(comm -23 "$B/routes.txt" "$C/routes.txt")
if [ -z "$REMOVED_ROUTES" ]; then
  pass "Nenhuma rota removida"
else
  fail "Rotas removidas:"; echo "$REMOVED_ROUTES" >> "$R"
fi
ADDED_ROUTES=$(comm -13 "$B/routes.txt" "$C/routes.txt")
if [ -n "$ADDED_ROUTES" ]; then
  warn "Rotas novas (verificar se é intencional):"; echo "$ADDED_ROUTES" >> "$R"
fi

# 4. NENHUM ENDPOINT DE API FOI PERDIDO
echo "" >> "$R"; echo "## 4. Endpoints de API consumidos preservados" | tee -a "$R"
REMOVED_EPS=$(comm -23 "$B/api-endpoints.txt" "$C/api-endpoints.txt")
if [ -z "$REMOVED_EPS" ]; then
  pass "Todos os endpoints do baseline continuam sendo chamados"
else
  fail "Endpoints que sumiram do código (possível regressão):"; echo "$REMOVED_EPS" >> "$R"
fi
ADDED_EPS=$(comm -13 "$B/api-endpoints.txt" "$C/api-endpoints.txt")
if [ -n "$ADDED_EPS" ]; then
  warn "Endpoints novos (verificar se é intencional):"; echo "$ADDED_EPS" >> "$R"
fi

# 5. EVENTOS WEBSOCKET PRESERVADOS
echo "" >> "$R"; echo "## 5. Eventos WebSocket preservados" | tee -a "$R"
REMOVED_WS=$(comm -23 "$B/ws-events.txt" "$C/ws-events.txt")
if [ -z "$REMOVED_WS" ]; then
  pass "Todos os eventos WebSocket continuam registrados"
else
  fail "Eventos WS sumidos:"; echo "$REMOVED_WS" >> "$R"
fi

# 6. TAMANHO DE page.tsx (objetivo: <250 linhas)
echo "" >> "$R"; echo "## 6. Tamanho das page.tsx" | tee -a "$R"
FAT_PAGES=$(awk -F'\t' '$2 > 250' "$C/page-sizes.tsv")
if [ -z "$FAT_PAGES" ]; then
  pass "Nenhuma page.tsx excede 250 linhas"
else
  fail "page.tsx acima do limite (>250 linhas):"
  echo "\`\`\`" >> "$R"; echo "$FAT_PAGES" >> "$R"; echo "\`\`\`" >> "$R"
fi

# 7. ACOPLAMENTO DIRETO api.* EM PÁGINAS (deveria CAIR)
echo "" >> "$R"; echo "## 7. Chamadas api.* diretas em app/ (meta: reduzir)" | tee -a "$R"
BEFORE=$(cat "$B/direct-api-calls-in-pages.txt")
AFTER=$(cat "$C/direct-api-calls-in-pages.txt")
echo "Antes: $BEFORE | Depois: $AFTER" >> "$R"
if [ "$AFTER" -lt "$BEFORE" ]; then
  pass "Acoplamento reduziu: $BEFORE → $AFTER chamadas diretas"
elif [ "$AFTER" -eq "$BEFORE" ]; then
  warn "Acoplamento igual: $AFTER. Refactor não extraiu chamadas para hooks."
else
  fail "Acoplamento AUMENTOU: $BEFORE → $AFTER. Refactor regrediu nesse aspecto."
fi

# 8. BUNDLE SIZE (não pode inflar mais que 10%)
echo "" >> "$R"; echo "## 8. Bundle size" | tee -a "$R"
BB=$(cat "$B/bundle-size.txt")
CB=$(cat "$C/bundle-size.txt")
echo "Antes: $BB | Depois: $CB" >> "$R"
# comparação textual simples — se quiser numérica rigorosa, converter para KB
if [ "$BB" = "$CB" ]; then
  pass "Bundle size igual ao baseline"
else
  warn "Bundle size mudou de $BB para $CB — verificar manualmente se aceitável"
fi

# 9. TIPOS PÚBLICOS REMOVIDOS (pode indicar que algo sumiu)
echo "" >> "$R"; echo "## 9. Tipos exportados preservados" | tee -a "$R"
REMOVED_TYPES=$(comm -23 "$B/exported-types.txt" "$C/exported-types.txt")
RT_COUNT=$(echo "$REMOVED_TYPES" | grep -c . || echo 0)
if [ "$RT_COUNT" -eq 0 ]; then
  pass "Nenhum tipo exportado sumiu"
else
  warn "$RT_COUNT tipos não exportados mais (pode ser intencional se eram privados de features):"
  echo "\`\`\`" >> "$R"; echo "$REMOVED_TYPES" | head -30 >> "$R"; echo "\`\`\`" >> "$R"
fi

echo ""
echo "📄 Relatório completo: $R"
echo ""
if [ $FAIL -eq 0 ]; then
  echo "✅ VALIDAÇÃO PASSOU — refactor preservou o comportamento"
  exit 0
else
  echo "❌ VALIDAÇÃO FALHOU — ver $R para detalhes"
  exit 1
fi
```

### Script 3: `.refactor-check/scripts/build-check.sh`

Executa o tripé `lint + typecheck + build`.

```bash
#!/usr/bin/env bash
set -uo pipefail
cd frontend

echo "🔧 1/3 — npm run lint"
npm run lint || { echo "❌ LINT falhou"; exit 1; }

echo "🔧 2/3 — npx tsc --noEmit"
npx tsc --noEmit || { echo "❌ TYPECHECK falhou"; exit 1; }

echo "🔧 3/3 — npm run build"
npm run build || { echo "❌ BUILD falhou"; exit 1; }

echo "✅ Lint + TypeCheck + Build OK"
```

### Script 4: `.refactor-check/scripts/smoke.sh`

Testa rotas críticas via `curl` com backend e frontend rodando localmente.

```bash
#!/usr/bin/env bash
# Pré-requisito: backend em :3000 e frontend em :3001 rodando, seed demo aplicado
set -uo pipefail

API="http://localhost:3000"
WEB="http://localhost:3001"
FAIL=0

check() {
  local desc="$1"; local url="$2"; local expected="$3"
  local code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$code" = "$expected" ]; then
    echo "✅ [$code] $desc"
  else
    echo "❌ [$code ≠ $expected] $desc ($url)"
    FAIL=1
  fi
}

echo "=== Smoke Test Runtime ==="

# Frontend — páginas públicas respondem 200
check "GET /login"            "$WEB/login"           "200"
check "GET /register"         "$WEB/register"        "200"
check "GET /join"             "$WEB/join"            "200"

# Frontend — páginas protegidas devem redirecionar (307/308) ou responder 200 com shell
check "GET /dashboard (sem auth)" "$WEB/dashboard"   "200"

# Backend — endpoints públicos
check "GET /health (se existir)" "$API/health"       "200"

# Login com user demo
echo ""
echo "=== Auth flow ==="
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo-facilitador@squad14.com","password":"demo123"}' \
  | jq -r '.accessToken // empty')

if [ -n "$TOKEN" ]; then
  echo "✅ Login retornou accessToken"
  AUTH="Authorization: Bearer $TOKEN"

  # Lista sessões autenticado
  S_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$API/sessions")
  if [ "$S_CODE" = "200" ]; then echo "✅ GET /sessions (auth) = 200"; else echo "❌ GET /sessions = $S_CODE"; FAIL=1; fi
else
  echo "⚠️  Login demo falhou — ajuste credenciais no script (.seed:demo foi executado?)"
  FAIL=1
fi

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "✅ SMOKE TEST PASSOU"
  exit 0
else
  echo ""
  echo "❌ SMOKE TEST FALHOU"
  exit 1
fi
```

### Script 5: `.refactor-check/refactor-check` (CLI entry)

```bash
#!/usr/bin/env bash
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

CMD="${1:-help}"

case "$CMD" in
  baseline)
    bash .refactor-check/scripts/snapshot.sh baseline
    ;;
  current|snapshot)
    bash .refactor-check/scripts/snapshot.sh current
    ;;
  validate|diff)
    bash .refactor-check/scripts/snapshot.sh current
    bash .refactor-check/scripts/diff.sh
    ;;
  build)
    bash .refactor-check/scripts/build-check.sh
    ;;
  smoke)
    bash .refactor-check/scripts/smoke.sh
    ;;
  full)
    bash .refactor-check/scripts/build-check.sh && \
    bash .refactor-check/scripts/snapshot.sh current && \
    bash .refactor-check/scripts/diff.sh && \
    bash .refactor-check/scripts/smoke.sh
    ;;
  report)
    LATEST=$(ls -1t .refactor-check/reports/diff-*.md 2>/dev/null | head -1)
    if [ -z "$LATEST" ]; then echo "Nenhum relatório. Rode: refactor-check validate"; exit 1; fi
    cp "$LATEST" .refactor-check/REPORT.md
    echo "📄 Relatório consolidado: .refactor-check/REPORT.md"
    cat .refactor-check/REPORT.md
    ;;
  *)
    echo "Uso: refactor-check <comando>"
    echo ""
    echo "Comandos:"
    echo "  baseline   Gera snapshot ANTES do refactor (rodar 1x)"
    echo "  validate   Compara estado atual com baseline (rodar após cada sessão)"
    echo "  build      Roda lint + typecheck + build no frontend"
    echo "  smoke      Testa rotas críticas via curl (exige stack rodando)"
    echo "  full       build + validate + smoke em sequência"
    echo "  report     Consolida o relatório mais recente em REPORT.md"
    ;;
esac
```

Torne executável:

```bash
chmod +x .refactor-check/refactor-check .refactor-check/scripts/*.sh
# atalho (opcional)
ln -sf .refactor-check/refactor-check ./refactor-check
```

---

## ▶️ ETAPA 1 — Baseline (ANTES de começar o refactor)

Execute **na branch `main` limpa**, com build já feito:

```bash
cd frontend && npm run build && cd ..
./refactor-check baseline
```

Commit o resultado:

```bash
git add .refactor-check/baseline/
git commit -m "chore: baseline do refactor frontend (snapshots pré-refactor)"
```

---

## ▶️ ETAPA 2 — Validação após cada sessão do refactor

Dentro da branch `refactor/frontend-feature-<nome>`:

```bash
# Após finalizar as mudanças da sessão:
./refactor-check build        # 1) Build limpo?
./refactor-check validate     # 2) Nenhuma regressão estrutural?
```

Se **alguma check falhar**, leia `.refactor-check/reports/diff-*.md`, corrija e rode de novo.

Só prossiga para a próxima sessão com **ambos os comandos retornando exit 0**.

---

## ▶️ ETAPA 3 — Smoke Test Runtime (antes de abrir PR final)

Stack subindo localmente:

```bash
# Terminal 1 — backend
cd backend
npm run seed:demo
npm run start:dev          # porta 3000

# Terminal 2 — frontend (build de produção, não dev)
cd frontend
npm run start              # porta 3001

# Terminal 3 — validação
./refactor-check smoke
```

E **validação manual adicional** (WebSocket não dá para automatizar com curl):

1. Abra duas abas incógnitas no navegador
2. Faça login com 2 users da mesma loja (ex.: `jogador1@demo.com` e `jogador2@demo.com` — veja `seed:demo`)
3. Entre no PO da loja nas duas abas
4. Altere `stockPurchased` em uma — confirme que atualiza na outra sem refresh
5. Se **SIM** → WebSocket OK → ✅ pode mergear
6. Se **NÃO** → ❌ há regressão no `useRealtimePlan`

---

## ▶️ ETAPA 4 — Relatório Final

Antes de abrir o PR final que integra tudo:

```bash
./refactor-check full        # build + validate + smoke
./refactor-check report      # consolida em .refactor-check/REPORT.md
```

Anexe `REPORT.md` no corpo do PR. O mentor/revisor bate o olho e vê de uma vez:

- Engine intocado ✅
- Backend intocado ✅
- 0 rotas removidas ✅
- 0 endpoints perdidos ✅
- 0 eventos WS perdidos ✅
- Nenhuma page.tsx > 250 linhas ✅
- Chamadas `api.*` em `app/` reduziram de **N** → **M** ✅
- Bundle size estável ✅

---

## 📊 Comparação com `code-review-graph` (opcional mas recomendado)

Para fechar o loop com a análise que motivou o refactor:

```bash
# Antes (pré-refactor, na main)
code-review-graph > .refactor-check/baseline/graph-analysis.txt

# Depois (pós-refactor, na branch final)
code-review-graph > .refactor-check/current/graph-analysis.txt

# Diff humano
diff .refactor-check/baseline/graph-analysis.txt .refactor-check/current/graph-analysis.txt
```

### Metas quantitativas esperadas (do relatório original)

| Métrica | Baseline | Meta pós-refactor | Aceitação |
|---|---|---|---|
| Coesão `plan-handle` / `features/plan` | **0.11** | **≥ 0.35** | Obrigatório |
| Coesão `ui-session` / `features/session` | **0.08** | **≥ 0.30** | Obrigatório |
| Edges `plan → lib-api` | **36** | **< 15** | Obrigatório |
| Edges `plan → ui-session` | **30** | **< 15** | Obrigatório |
| Coesão média frontend | **~0.06** | **≥ 0.25** | Desejável |

Se alguma meta **obrigatória** não foi atingida, o refactor não terminou — tem acoplamento residual que precisa ser extraído.

---

## 🧠 Diretrizes para o Agente (Claude Code)

1. **Primeiro rode `baseline`** — sem isso, o `validate` não tem com que comparar.
2. **Não edite os snapshots** sob nenhuma circunstância — se eles estão errados, rode o baseline de novo na main limpa.
3. **Se `validate` falhar com "ENGINE FOI MODIFICADO"**: pare tudo. Dê `git diff backend/src/engine/` e reverta antes de continuar. Isso é tolerância zero.
4. **Se `smoke` falhar em uma rota específica**: antes de culpar o refactor, verifique se o seed demo rodou e se as portas estão corretas.
5. **O relatório é fonte da verdade para o PR** — cole-o no corpo do PR e marque ✅/❌ no template.

---

## 🆘 Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `jq: command not found` | falta o `jq` | `sudo apt install jq` |
| `validate` acusa backend modificado mas você não tocou | arquivos gerados (dist/, node_modules/) entraram no hash | revise o `find` do snapshot para excluir `dist`, `node_modules` |
| `smoke` acusa login falhou | seed demo não rodou | `cd backend && npm run seed:demo` |
| Endpoints novos apareceram no `validate` | você criou hooks que chamam rotas que ninguém chamava antes | inaceitável no refactor puro — remova |
| Coesão não subiu no `code-review-graph` | hooks criados mas ainda há `api.*` cru nas páginas | o refactor não foi até o fim — extraia as chamadas residuais |

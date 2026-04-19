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

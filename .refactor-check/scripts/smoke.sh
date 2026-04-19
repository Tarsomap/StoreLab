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

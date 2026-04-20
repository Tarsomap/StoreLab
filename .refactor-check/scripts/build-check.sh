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

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
# grep retorna código 1 quando não há matches; subshell + || true evita falha com pipefail
(grep -rE "api\.(get|post|patch|put|delete)" frontend/src/app 2>/dev/null || true) | wc -l > "${OUT}/direct-api-calls-in-pages.txt"

echo "✅ Snapshot ${MODE} salvo em ${OUT}/"
ls -la "${OUT}/"

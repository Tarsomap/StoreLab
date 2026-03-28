---
paths:
  - "backend/src/engine/**/*.ts"
---

# Engine Rules — Retail Game Platform

## Estado: ✅ CONCLUÍDO — NÃO MODIFICAR

O motor de cálculo está completo com 72 testes unitários e 100% de cobertura.
Qualquer alteração no engine/ DEVE ser acompanhada de testes que comprovem que os
resultados permanecem corretos.

## O que NÃO fazer
- NÃO refatorar "por estética" — o código está testado e validado
- NÃO alterar fórmulas sem validar contra docs/agent/spec.md v1.1
- NÃO adicionar features ao engine sem criar testes primeiro
- NÃO remover ou renomear métodos públicos (outros módulos dependem deles)

## Cadeia de Dependências
CSAT → Demanda → Quebras/Aging → EBITDA ← SLA

## Módulos
- csat.service.ts: (ops/10) × (quizScore/100)
- demand.service.ts: ranking 1-4 por preço/disponibilidade/CSAT
- shrinkage.service.ts: quebras + aging (só rodada 3)
- financial.service.ts: DRE completa → EBITDA
- sla.service.ts: eventos probabilísticos por CAPEX não implementado

## Se precisar alterar o engine
1. Ler docs/agent/spec.md INTEIRO antes
2. Criar teste que falha primeiro (TDD)
3. Fazer a alteração mínima
4. Rodar `npm run test` — TODOS os 72 testes devem passar
5. Rodar `npm run test:cov` — cobertura não pode cair abaixo de 100%

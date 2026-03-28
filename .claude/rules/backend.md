---
paths:
  - "backend/src/**/*.ts"
---

# Backend Rules — Retail Game Platform

## Estado Atual: ✅ MVP Completo
TODOS os módulos estão implementados, testados e funcionando.
NÃO reimplementar módulos existentes.
NÃO alterar regras de negócio sem consultar docs/agent/spec.md.

## Módulos e Status

| Módulo | Status | Testes |
|--------|--------|--------|
| auth/ | ✅ Completo | Login, register, refresh, guards |
| users/ | ✅ Completo | findById, findByEmail |
| sessions/ | ✅ Completo | CRUD, state machine, invite codes |
| stores/ | ✅ Completo | CRUD, join, 5 papéis, reentrada |
| plans/ | ✅ Completo | PO, category decisions, CAPEX, workforce, confirm |
| quiz/ | ✅ Completo | 10 perguntas/rodada, consolidação, CSAT |
| engine/ | ✅ Completo | 72 testes, 100% cobertura — NÃO TOCAR |
| results/ | ✅ Completo | Round results, ranking, caixa final |
| gateway/ | ✅ Completo | 7 eventos WebSocket |
| transfer/ | ✅ Completo | 8 validações, 1-2 jogadores obrigatórios |

## Quando alterar o backend
O backend SÓ deve ser alterado para:
- Fase C: novos endpoints (PDF export, histórico de sessões)
- Correções de bugs encontrados durante testes de integração
- NÃO para reformatar, refatorar "por estética" ou reorganizar

## Regras Técnicas
- Controllers finos — toda lógica nos services
- DTO validation com class-validator em TODOS os endpoints
- Nunca hardcodar constantes fora de constants/ ou seed/
- Prisma transactions para operações que envolvem múltiplas tabelas
- Seed determinístico para SLA: hash(`${sessionId}-${storeId}-${round}-${capexKey}`)
- Estoque é sempre em UNIDADES (quantidade), nunca em R$
- Quebras/Aging: SÓ no final da rodada 3, sobre estoque acumulado
- Transferências: OBRIGATÓRIAS (1-2 por loja), Gerente intransferível

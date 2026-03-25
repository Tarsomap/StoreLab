# ⚙️ Sprint 1 — Revisão: Motor de Cálculo

> **Issues GitHub:**
> - [#43 — [REVIEW] Módulo do Motor de Cálculo](https://github.com/Tarsomap/retail-game-platform/issues/43)
> - [#44 — [REVIEW] Módulo de Resultados e WebSocket](https://github.com/Tarsomap/retail-game-platform/issues/44)
>
> **Módulos:** `backend/src/engine/`, `backend/src/results/`, `backend/src/gateway/`
> **Área:** Backend
>
> Leia [`docs/agent/ARCHITECTURE.md`](../../agent/ARCHITECTURE.md) — seção Calculation Engine — antes de começar.

---

## O que o agente gerou

O agente gerou o código completo do motor de cálculo, incluindo:
- `CsatService` — calcula nota de atendimento da loja
- `DemandService` — distribui clientes entre lojas
- `FinancialService` — calcula EBITDA completo
- `SlaService` — aplica penalidades de CAPEX não realizado
- `ResultsService` — salva e retorna resultados por rodada
- `Gateway` (WebSocket) — envia eventos em tempo real

**Seu trabalho não é implementar — é revisar, testar e garantir que as fórmulas estão corretas.**

> ⚠️ Este é o módulo mais crítico do sistema. Qualquer erro aqui afeta todos os resultados do jogo.

---

## Como começar

```bash
git checkout main && git pull
git checkout -b review/engine
cd backend && npm run start:dev
```

---

## Fórmulas de referência

```
CSAT = (operadores_caixa / 10) × (acertos_quiz / total_perguntas)

Juros = MAX(0, caixa_usado - 700.000) × 0.12

Manutenção = CAPEX FREEZER implementado ? R$0 : R$400

Folha = (operadores_caixa × R$1.000) + (operadores_serviço × R$1.200)

Licença = R$500 base
         + R$100 se SECURITY implementado
         + R$150 se SITE implementado
         + R$320 se SELF_CHECKOUT implementado

EBITDA = Receita Líquida - COGS - Quebras* - Aging* - Folha - Manutenção - Licença - Juros - Perdas SLA
```

> *Quebras e Aging são calculados **apenas ao final da rodada 3**, sobre o estoque total acumulado não vendido.

---

## Checklist de revisão

### 📚 Leitura e validação das fórmulas
- [ ] Confirmar as constantes em `financial.service.ts`:
  - `CASHIER_SALARY = 1000`
  - `SERVICE_SALARY = 1200`
  - `MAINTENANCE_COST = 400` (só sem CAPEX FREEZER)
  - `BASE_LICENSE = 500`
  - `INTEREST_RATE = 0.12`
- [ ] Confirmar que Quebras e Aging são calculados **apenas na rodada 3**
- [ ] Confirmar que o sorteio de SLA é determinístico (hash baseado em `sessionId + storeId + round + capexType`, **nunca `Math.random()` puro**)
- [ ] Confirmar que o resultado de CSAT está sempre entre 0 e 1

### 🧪 Testes unitários obrigatórios

Rodar: `npm run test`

**CSAT:**
- [ ] 10 operadores + 100% quiz = **1.0**
- [ ] 0 operadores = **0.0**
- [ ] 8 operadores + 70% quiz = **0.56**

**Financeiro:**
- [ ] Caixa R$800k → juros = **R$12.000** (100k × 12%)
- [ ] Caixa R$600k → juros = **R$0**
- [ ] CAPEX FREEZER implementado → manutenção = **R$0**
- [ ] Sem CAPEX FREEZER → manutenção = **R$400**
- [ ] Licença base sem CAPEX = **R$500**
- [ ] Licença com SECURITY + SITE = **R$750**
- [ ] Rodada 1 e 2: Quebras e Aging = **R$0**
- [ ] Rodada 3 com 100 un. de ELETRO não vendidas → aging = **R$600** (100 × R$120 × 5%)
- [ ] EBITDA negativo quando custos superam receita

**SLA:**
- [ ] Rodar 1000 iterações do sorteio SECURITY → ~15% devem ter evento (±5%)
- [ ] Cobertura mínima **80%** em `engine/`

### 🔌 Testes WebSocket (testar com 2 abas abertas)
- [ ] Evento `round:results` — todos recebem resultados simultaneamente
- [ ] Evento `plan:updated` — alterações no PO aparecem para os outros membros da loja
- [ ] Evento `store:confirmed` — facilitador recebe notificação quando loja confirma
- [ ] Evento `session:finished` — todos recebem o resultado final
- [ ] Evento `sla:event` — loja recebe notificação de penalidade
- [ ] Latência dos eventos: deve ser **menor que 500ms**

### 🌐 Endpoints REST
- [ ] `GET /results/:sessionId` — retorna resultados de todas as rodadas
- [ ] `GET /results/:sessionId/ranking` — retorna ranking por % EBITDA (maior no topo)

### ✍️ Contribuição obrigatória
- [ ] Aplicar pelo menos **1 melhoria real** no código
- [ ] Se a tabela de dias de downtime por operadores de serviço não tiver `// TODO`, adicionar

---

## Entrega

- [ ] PR aberto com título: `review(engine): [o que foi corrigido/melhorado]`
- [ ] PR linkado às issues #43 e #44 (`Fecha #43` e `Fecha #44` na descrição)
- [ ] Todos os testes unitários passando (`npm run test`)
- [ ] Pelo menos 1 aprovação antes do merge

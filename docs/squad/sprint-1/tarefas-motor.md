# ⚙️ Sprint 1 — Tarefas: Motor de Cálculo

> **Épico:** Motor de Cálculo e Rodadas
> **User Stories:** US-17, US-18, US-19, US-20, US-21, US-22, US-23, US-24
> **Estimativa total:** 4–5 semanas
>
> Leia [`docs/agent/CONTEXT.md`](../../agent/CONTEXT.md) antes de começar.
> Este é o módulo mais crítico do sistema. **Testes unitários são obrigatórios (cobertura mínima 80%).**

---

## Visão geral

O motor é o cérebro do jogo. Quando o Facilitador clica "Executar Rodada", o motor:

1. Aplica eventos de SLA (penalidades por CAPEX não feito + tempo de resolução por operadores de serviço)
2. Calcula o CSAT de cada loja
3. Distribui a demanda entre as lojas
4. Calcula o EBITDA de cada loja
5. Persiste os resultados
6. Emite os resultados via WebSocket para todos

> ⚠️ **Quebras e Aging** são calculados **apenas uma vez, ao final da rodada 3**, sobre o estoque total não vendido acumulado. Não são calculados por rodada.

Todos os cálculos devem ser **determinísticos** (mesmo input = mesmo output) e **testados isoladamente**.

---

## TASK-12 — Seed de categorias e CAPEX (backend)

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-07

### O que fazer

Criar `backend/src/seed/seed.ts` com os dados constantes do sistema:

```typescript
// Categorias (constantes de negócio)
const CATEGORIES = [
  { name: 'PERECIVEIS', unitCost: 8.00,   taxRate: 0.0925, breakageRate: 0.030, agingRate: 0.020 },
  { name: 'MERCEARIA',  unitCost: 5.00,   taxRate: 0.0765, breakageRate: 0.010, agingRate: 0.000 },
  { name: 'ELETRO',     unitCost: 120.00, taxRate: 0.1250, breakageRate: 0.002, agingRate: 0.050 },
  { name: 'HIPEL',      unitCost: 45.00,  taxRate: 0.0765, breakageRate: 0.005, agingRate: 0.010 },
]

// CAPEX options (constantes de negócio)
// ⚠️ TODO: confirmar custo de aquisição (campo `cost`) com o parceiro empresarial — está em imagem no .docx de regras
// monthlyLicenseDelta: delta sobre a licença base de R$500/mês
//   SECURITY: +R$100 (R$500 × 20%)
//   SITE:     +R$150 (R$500 × 30%)
//   SELF_CHECKOUT: +R$320 (R$80 × 4 unidades)
//   Demais: 0
const CAPEX_OPTIONS = [
  { name: 'Segurança',        type: 'SECURITY',      cost: 0 /* TODO */, monthlyLicenseDelta: 100,  slaImpactDays: 2, slaRisk: 0.15, eliminatesMaintenance: false },
  { name: 'Freezer/Balança',  type: 'FREEZER',       cost: 0 /* TODO */, monthlyLicenseDelta: 0,    slaImpactDays: 3, slaRisk: 0.10, eliminatesMaintenance: true  },
  { name: 'Redes',             type: 'NETWORK',       cost: 0 /* TODO */, monthlyLicenseDelta: 0,    slaImpactDays: 1, slaRisk: 0.05, eliminatesMaintenance: false },
  { name: 'Site',              type: 'SITE',          cost: 0 /* TODO */, monthlyLicenseDelta: 150,  slaImpactDays: 0, slaRisk: 0.00, eliminatesMaintenance: false },
  { name: 'Self Checkout',     type: 'SELF_CHECKOUT', cost: 0 /* TODO */, monthlyLicenseDelta: 320,  slaImpactDays: 0, slaRisk: 0.00, eliminatesMaintenance: false },
  { name: 'Automação',        type: 'AUTOMATION',    cost: 0 /* TODO */, monthlyLicenseDelta: 0,    slaImpactDays: 0, slaRisk: 0.00, eliminatesMaintenance: false },
]
```

Adicionar script no `package.json`:
```json
"seed": "ts-node prisma/seed.ts"
```

### Por que seed e não hardcode?
Os valores de negócio (custo, taxas) devem vir do banco. Se um dia mudar, basta re-rodar o seed — sem alterar código de produção.

### Critérios de aceite
- [ ] Script seed roda sem erros
- [ ] 4 categorias criadas no banco com valores corretos
- [ ] 6 CAPEX options criados com valores corretos
- [ ] Rodar o seed duas vezes não duplica os registros (usar `upsert`)
- [ ] Custo de aquisição (`cost`) confirmado com parceiro antes do deploy

---

## TASK-13 — Serviço de CSAT (backend)

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-12

### Fórmula

```
CSAT = (cashier_operators / 10) × (quiz_correct_answers / quiz_total_questions)
```

### O que fazer

Criar `backend/src/engine/csat.service.ts`:

```typescript
const IDEAL_OPERATORS = 10 // constante do sistema

calculateCsat(cashierOperators: number, quizCorrect: number, quizTotal: number): number {
  const operatorRatio = cashierOperators / IDEAL_OPERATORS
  const quizScore    = quizTotal > 0 ? quizCorrect / quizTotal : 0
  return operatorRatio * quizScore  // resultado entre 0 e 1
}
```

**Validações:**
- `cashierOperators` entre 0 e 10
- `quizCorrect` entre 0 e `quizTotal`
- Se quiz não respondido, usar `quizScore = 0`

### Testes obrigatórios

```typescript
expect(calculateCsat(10, 10, 10)).toBe(1.0)   // CSAT máximo
expect(calculateCsat(8,  8,  10)).toBeCloseTo(0.64)
expect(calculateCsat(0,  10, 10)).toBe(0.0)   // sem operadores
expect(calculateCsat(10, 0,  10)).toBe(0.0)   // quiz zerado
expect(calculateCsat(5,  9,  10)).toBeCloseTo(0.45) // exemplo do .docx
```

### Critérios de aceite
- [ ] Fórmula implementada corretamente
- [ ] Pelo menos 6 testes unitários cobrindo casos extremos
- [ ] Resultado sempre entre 0 e 1

---

## TASK-14 — Serviço de distribuição de demanda (backend)

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-13

### Lógica completa

```
1. Para cada loja, calcular 3 indicadores:
   - Disponibilidade = stock_purchased / available_stock_da_categoria  (maior = melhor)
   - Preço          = menor preço médio entre lojas / preço_desta_loja (menor preço = melhor)
   - CSAT           = score calculado pelo CsatService                  (maior = melhor)

2. Rankear as 4 lojas em cada indicador:
   - 1º lugar = 4 pontos | 2º = 3 | 3º = 2 | 4º = 1

3. demand_share = soma_pontos_loja / soma_total_pontos_todas_lojas

4. demanda_absoluta = demand_share × expected_demand_da_sessão
   (expected_demand foi definido pelo Facilitador na criação da sessão)
```

### Caso especial: empate
Se duas lojas tiverem indicadores idênticos no mesmo rank, dividir os pontos igualmente.

### Testes obrigatórios
- [ ] 4 lojas idênticas → cada uma recebe 25% da demanda
- [ ] 1 loja com melhor preço, demais iguais → essa loja recebe mais
- [ ] Soma das demandas absolutas = total da sessão (dentro de margem de arredondamento)

### Critérios de aceite
- [ ] Lógica de ranking implementada para os 3 indicadores
- [ ] Demanda absoluta calculada com base no `expected_demand` da sessão
- [ ] Soma total = 100% (validação no teste integrado)
- [ ] Pelo menos 8 testes unitários

---

## TASK-15 — Serviço financeiro / EBITDA (backend)

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-14

### Constantes do sistema

```typescript
const CASHIER_SALARY    = 1000   // R$/mês por operador de caixa
const SERVICE_SALARY    = 1200   // R$/mês por operador de serviço
const MAINTENANCE_COST  = 400    // R$/mês — cobrado APENAS se CAPEX FREEZER NÃO implementado
const BASE_LICENSE      = 500    // R$/mês licença base de software
const INTEREST_RATE     = 0.12   // 12% ao mês sobre caixa > R$700k
const CASH_LIMIT        = 700000 // limite de caixa sem juros
```

### Fórmula completa (por loja, por rodada)

```typescript
// Por categoria (por rodada):
grossRevenue   = stockSold * unitCost * (1 + priceMargin)
taxAmount      = grossRevenue * category.taxRate
costOfGoods    = stockSold * category.unitCost
unsoldStock    = stockPurchased - stockSold  // acumulado entre rodadas

// ⚠️ ATENÇÃO: Quebras e Aging calculados APENAS ao final da rodada 3
// sobre o estoque não vendido TOTAL acumulado — não por rodada
breakageAmount = (round === 3) ? totalUnsoldStock * unitCost * category.breakageRate : 0
agingAmount    = (round === 3) ? totalUnsoldStock * unitCost * category.agingRate    : 0

// Totais da loja:
totalGrossRevenue = Σ grossRevenue
totalTax          = Σ taxAmount
totalCOGS         = Σ costOfGoods
netRevenue        = totalGrossRevenue - totalTax

// Custos:
payroll      = (cashierOps * CASHIER_SALARY) + (serviceOps * SERVICE_SALARY)
maintenance  = isCapexFreezerImplemented ? 0 : MAINTENANCE_COST
licenses     = BASE_LICENSE + Σ(capex.monthlyLicenseDelta para cada CAPEX implementado)
interest     = cashUsed > CASH_LIMIT ? (cashUsed - CASH_LIMIT) * INTEREST_RATE : 0
slaLoss      = Σ SlaEvent.revenueLost

// Resultado final:
totalCosts       = totalCOGS + breakageAmount + agingAmount
                   + payroll + maintenance + licenses + interest + slaLoss
ebitda           = netRevenue - totalCosts
ebitdaPercentage = ebitda / totalGrossRevenue
```

### Validações
- `grossRevenue` nunca negativo
- `ebitda` pode ser negativo (decisões ruins)
- `ebitdaPercentage` entre -100% e +100%

### Testes obrigatórios
- [ ] Cenário ideal: receita alta, custos baixos → EBITDA positivo
- [ ] Cenário ruim: estoque alto + preço baixo → EBITDA negativo
- [ ] Cenário com juros: cashUsed > 700k → juros a 12% descontados
- [ ] Cenário manuteno: CAPEX FREEZER não implementado → R$400 cobrado; implementado → R$0
- [ ] Cenário licença: SECURITY implementado → licença = R$500 + R$100 = R$600
- [ ] Cenário SLA: CAPEX não feito + evento → receita perdida descontada
- [ ] Quebras/Aging aplicados apenas na rodada 3
- [ ] Mínimo 15 casos diferentes

### Critérios de aceite
- [ ] Fórmula implementada na ordem correta
- [ ] Todos os componentes persistidos em `RoundResult`
- [ ] Pelo menos 15 testes unitários

---

## TASK-16 — Serviço de eventos SLA (backend)

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-12

### Lógica

#### Tipo 1 — SLA por CAPEX não implementado (eventos aleatórios)

Para cada CAPEX **não implementado** pela loja:
1. Sortear com probabilidade = `capex.slaRisk`
2. Se evento ocorre: calcular receita perdida com base nos dias de downtime
3. Registrar `SlaEvent` no banco

```typescript
// Probabilidade e impacto por CAPEX (do seed):
SECURITY:  15% → loja sem operar por N dias (receita perdida proporcional)
FREEZER:   10% → Perecíveis não podem ser vendidos por N dias
NETWORK:    5% → loja offline por N dias
```

**Importante:** usar hash determinístico para o sorteio:
```typescript
// sorteio reproduzível: mesmo round + store + capex → mesmo resultado
const seed = hash(`${sessionId}-${storeId}-${round}-${capexType}`)
```

#### Tipo 2 — SLA por operadores de serviço (tempo de resolução)

O número de operadores de serviço contratados afeta diretamente o tempo de resolução dos eventos SLA. Quanto menos operadores, mais dias de downtime quando um evento ocorre.

> ⚠️ TODO: a tabela exata de dias de resolução por número de operadores está em imagem no .docx de regras oficiais. Confirmar com o parceiro empresarial antes de implementar. Usar placeholder até confirmar.

```typescript
// Placeholder — substituir pelos valores reais após confirmação
const SLA_DAYS_BY_SERVICE_OPERATORS: Record<number, number> = {
  1: 5, // TODO: confirmar
  2: 4, // TODO: confirmar
  3: 3, // TODO: confirmar
  4: 2, // TODO: confirmar
  5: 1, // TODO: confirmar
}
```

### Critérios de aceite
- [ ] Eventos aplicados apenas para CAPEXs não implementados
- [ ] Sorteio determinístico (mesmo input = mesmo output)
- [ ] `SlaEvent` persistido com `capexType`, `daysImpacted`, `revenueLost`
- [ ] Receita perdida descontada corretamente do EBITDA
- [ ] Número de operadores de serviço impacta os dias de downtime
- [ ] Testes com 1000 iterações validando a distribuição de probabilidade (~15% para SECURITY)

---

## TASK-17 — Engine Service (orquestrador) (backend)

**Responsável:** Backend
**Prioridade:** 🔴 Bloqueante
**Depende de:** TASK-13, TASK-14, TASK-15, TASK-16

### O que fazer

Criar `backend/src/engine/engine.service.ts` que orquestra todos os serviços:

```typescript
async runRound(sessionId: string, round: number): Promise<void> {
  const stores = await this.getStoresWithPlans(sessionId, round)

  // 1. Aplicar SLA (CAPEX-based + operação de serviços)
  const slaResults = await this.slaService.applyEvents(stores, round)

  // 2. Calcular CSAT
  const csatScores = await this.csatService.calculateAll(stores)

  // 3. Distribuir demanda
  const demandResults = await this.demandService.distribute(stores, csatScores, sessionId)

  // 4. Calcular EBITDA (Quebras/Aging apenas na rodada 3)
  const financialResults = await this.financialService.calculateAll(stores, demandResults, slaResults, round)

  // 5. Persistir resultados
  await this.resultService.persistRoundResults(sessionId, round, financialResults)

  // 6. Emitir via WebSocket
  this.gateway.emitToSession(sessionId, 'round:results', financialResults)
}
```

**Endpoint que dispara o engine:**
```
POST /engine/run-round
Auth: FACILITATOR
Body: { sessionId, round }
```

### Critérios de aceite
- [ ] Engine executa os 5 passos na ordem correta
- [ ] Resultados persistidos em `RoundResult` para cada loja
- [ ] WebSocket emite `round:results` após cálculo
- [ ] Sessão avança de estado automaticamente após engine terminar
- [ ] Engine é idempotente (re-executar não duplica resultados)
- [ ] Quebras e Aging aplicados apenas quando `round === 3`

---

## Ordem de execução sugerida

```
TASK-12 (seed)
    ├── TASK-13 (CSAT)
    ├── TASK-16 (SLA)
    └── TASK-14 (demanda) ─── TASK-15 (EBITDA) ─── TASK-17 (engine)
```

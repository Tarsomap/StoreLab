# ⚙️ Sprint 1 — Tarefas: Motor de Cálculo

> **Épico:** Motor de Cálculo e Rodadas
> **User Stories:** US-17, US-18, US-19, US-20, US-21
> **Estimativa total:** 4–5 semanas
>
> Leia [`docs/agent/CONTEXT.md`](../../agent/CONTEXT.md) antes de começar.
> Este é o módulo mais crítico do sistema. **Testes unitários são obrigatórios.**

---

## Visão geral

O motor é o cérebro do jogo. Quando o Facilitador clica "Executar Rodada", o motor:

1. Aplica eventos de SLA (penalidades por CAPEX não feito)
2. Calcula o CSAT de cada loja
3. Distribui a demanda entre as lojas
4. Calcula o EBITDA de cada loja
5. Persiste os resultados
6. Emite os resultados via WebSocket para todos

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
const CAPEX_OPTIONS = [
  { name: 'Segurança',         type: 'SECURITY',      cost: 30000,  monthlyLicenseDelta: 2000, slaImpactDays: 2, slaRisk: 0.15 },
  { name: 'Freezer/Balança',   type: 'FREEZER',       cost: 80000,  monthlyLicenseDelta: 1500, slaImpactDays: 3, slaRisk: 0.10 },
  { name: 'Redes',             type: 'NETWORK',       cost: 50000,  monthlyLicenseDelta: 3000, slaImpactDays: 1, slaRisk: 0.05 },
  { name: 'Site',              type: 'SITE',          cost: 100000, monthlyLicenseDelta: 5000, slaImpactDays: 0, slaRisk: 0.00 },
  { name: 'Self Checkout',     type: 'SELF_CHECKOUT', cost: 60000,  monthlyLicenseDelta: 2500, slaImpactDays: 0, slaRisk: 0.00 },
  { name: 'Automação',        type: 'AUTOMATION',    cost: 40000,  monthlyLicenseDelta: 1000, slaImpactDays: 0, slaRisk: 0.00 },
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
calculateCsat(cashierOperators: number, quizCorrect: number, quizTotal: number): number {
  const operatorRatio = cashierOperators / IDEAL_OPERATORS  // IDEAL_OPERATORS = 10
  const quizScore    = quizCorrect / quizTotal
  return operatorRatio * quizScore  // resultado entre 0 e 1
}
```

**Validações:**
- `cashierOperators` entre 0 e 10
- `quizCorrect` entre 0 e `quizTotal`
- Se quiz não respondido, usar `quizScore = 0`

### Testes obrigatórios

```typescript
// Exemplos que devem passar:
expect(calculateCsat(10, 10, 10)).toBe(1.0)   // CSAT máximo
expect(calculateCsat(8,  8,  10)).toBe(0.64)  // caso básico
expect(calculateCsat(0,  10, 10)).toBe(0.0)   // sem operadores
expect(calculateCsat(10, 0,  10)).toBe(0.0)   // quiz zerado
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

### Fórmula completa (por loja, por rodada)

```typescript
// Por categoria:
grossRevenue   = stockSold * unitCost * (1 + priceMargin)
taxAmount      = grossRevenue * category.taxRate
costOfGoods    = stockSold * category.unitCost
unsoldStock    = stockPurchased - stockSold
breakageAmount = unsoldStock * category.unitCost * category.breakageRate
agingAmount    = unsoldStock * category.unitCost * category.agingRate

// Totais da loja:
totalGrossRevenue = Σ grossRevenue
totalTax          = Σ taxAmount
totalCOGS         = Σ costOfGoods
totalBreakage     = Σ breakageAmount
totalAging        = Σ agingAmount
netRevenue        = totalGrossRevenue - totalTax

// Custos fixos e variáveis:
payroll      = (cashierOps * 2000) + (serviceOps * 2500)
maintenance  = 5000  // fixo
licenses     = Σ(capex.monthlyLicenseDelta para cada CAPEX implementado)
interest     = cashUsed > 700000 ? (cashUsed - 700000) * 0.01 : 0
slaLoss      = Σ SlaEvent.revenueLost

// Resultado final:
totalCosts       = totalCOGS + totalBreakage + totalAging + payroll + maintenance + licenses + interest + slaLoss
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
- [ ] Cenário com juros: cashUsed > 700k → juros descontados
- [ ] Cenário SLA: CAPEX não feito + evento → receita perdida descontada
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

Para cada CAPEX **não implementado** pela loja:
1. Sortear com probabilidade = `capex.slaRisk`
2. Se evento ocorre: calcular receita perdida
3. Registrar `SlaEvent` no banco

```typescript
// Probabilidade de evento por CAPEX (do seed):
SECURITY:  15% → perde 2% da receita bruta estimada
FREEZER:   10% → aging +30% nos perecíveis
NETWORK:    5% → 1 hora de downtime (perde receita proporcional)
```

**Importante:** usar hash determinístico para o sorteio:
```typescript
// sorteio reproduzível: mesmo round + store → mesmo resultado
const seed = hash(`${roundId}-${storeId}-${capexType}`)
```
Isso garante que o resultado não muda se o engine for re-executado por engano.

### Critérios de aceite
- [ ] Eventos aplicados apenas para CAPEXs não implementados
- [ ] Sorteio determinístico (mesmo input = mesmo output)
- [ ] `SlaEvent` persistido com `capexType`, `daysImpacted`, `revenueLost`
- [ ] Receita perdida descontada corretamente do EBITDA
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

  // 1. Aplicar SLA
  const slaResults = await this.slaService.applyEvents(stores)

  // 2. Calcular CSAT
  const csatScores = await this.csatService.calculateAll(stores)

  // 3. Distribuir demanda
  const demandResults = await this.demandService.distribute(stores, csatScores, sessionId)

  // 4. Calcular EBITDA
  const financialResults = await this.financialService.calculateAll(stores, demandResults, slaResults)

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

---

## Ordem de execução sugerida

```
TASK-12 (seed)
    ├── TASK-13 (CSAT)
    ├── TASK-16 (SLA)
    └── TASK-14 (demanda) ─── TASK-15 (EBITDA) ─── TASK-17 (engine)
```

# Plano de Desenvolvimento Técnico — Motor de Cálculo
**Épico 4 | Retail Game Platform | Residência em Software II**

---

## 1. Visão Geral

Este documento detalha as **tasks técnicas concretas** para implementar o motor de cálculo (Épico 4), partindo do schema Prisma já definido e da arquitetura NestJS. O desenvolvimento segue a ordem de dependência lógica: CSAT → Demanda → Quebras/Aging → EBITDA → SLA → Transferência.

---

## 2. Pré-requisitos antes de começar

Antes de implementar qualquer US do motor, verifique:

- [ ] Schema Prisma migrado (`npx prisma migrate dev`)
- [ ] Seed executado (`npx prisma db seed`) — categorias e CAPEX_OPTIONs populados
- [ ] Módulo `engine/` criado no NestJS
- [ ] Jest configurado com `coverage` habilitado (`jest --coverage`)
- [ ] Arquivo `src/engine/constants.ts` criado (centraliza todas as constantes de negócio)

### `src/engine/constants.ts` (template inicial)

```typescript
export const ENGINE_CONSTANTS = {
  MAX_CASHIER_OPERATORS: 10,
  EXCESS_CASH_THRESHOLD: 700_000,
  EXCESS_CASH_INTEREST_RATE: 0.01, // 1% a.m.
  MAINTENANCE_COST: 5_000,
  CASHIER_SALARY: 2_000,
  SERVICE_OPERATOR_SALARY: 2_500,
  MAX_PLAYER_TRANSFERS: 2,
};
```

> **Por quê centralizar?** Se o cliente pedir para mudar o salário de operador de R$2000 para R$2200, você altera em **um único lugar** — não em 5 arquivos diferentes.

---

## 3. Tasks Técnicas por US

### 🔴 US-17 — Calcular CSAT

**Módulo:** `src/engine/services/csat.service.ts`

#### Tasks:

| # | Task | Esforço |
|---|---|---|
| 17.1 | Criar `CsatService` com método `calculate(cashierOps: number, quizScore: number): number` | 1h |
| 17.2 | Implementar fórmula: `(cashierOps / MAX_CASHIER_OPERATORS) * (quizScore / 100)` | 30min |
| 17.3 | Adicionar validações (ops entre 0-10, quiz entre 0-100, retornar 0 se null) | 30min |
| 17.4 | Escrever testes unitários: mínimo 10 combinações (arquivo: `csat.service.spec.ts`) | 2h |
| 17.5 | Registrar resultado no campo `csatScore` da tabela `RoundResult` via `ResultService` | 1h |

#### Exemplo de teste:

```typescript
describe('CsatService', () => {
  it('deve retornar 64% com 8 operadores e 80% quiz', () => {
    expect(service.calculate(8, 80)).toBeCloseTo(0.64);
  });

  it('deve retornar 0 se operadores = 0', () => {
    expect(service.calculate(0, 100)).toBe(0);
  });

  it('deve retornar 1 (100%) com máximo de tudo', () => {
    expect(service.calculate(10, 100)).toBe(1);
  });
});
```

---

### 🔴 US-18 — Distribuir Demanda

**Módulo:** `src/engine/services/demand.service.ts`

#### Tasks:

| # | Task | Esforço |
|---|---|---|
| 18.1 | Criar `DemandService` com método `distribute(stores: StoreWithPlan[]): DemandResult[]` | 1h |
| 18.2 | Implementar cálculo de indicadores por loja (preço, disponibilidade, CSAT) | 2h |
| 18.3 | Implementar ranking 1-4 por indicador com `rankStoresByIndicator()` helper | 1.5h |
| 18.4 | Calcular `demandShare` e `demandAbsoluta` para cada loja | 1h |
| 18.5 | Tratar empate no ranking (mesma pontuação → mesmo rank, próximo rank pulado) | 1h |
| 18.6 | Escrever testes: 4 cenários principais + teste "todas iguais = 25% cada" | 3h |

#### Interface de entrada/saída:

```typescript
// Entrada
interface StoreWithPlan {
  storeId: string;
  stockAvailable: number;      // sum(stockPurchased) por categoria
  basketPrice: number;         // preço médio ponderado da loja
  csatScore: number;           // resultado da US-17
  expectedDemand: number;      // seed da sessão
}

// Saída
interface DemandResult {
  storeId: string;
  pricePoints: number;         // 1-4
  availabilityPoints: number;  // 1-4
  csatPoints: number;          // 1-4
  totalPoints: number;         // soma dos 3
  demandShare: number;         // % (0 a 1)
  demandAbsoluta: number;      // unidades absolutas
}
```

#### Lógica de ranking:

```typescript
// Preço: melhor = MENOR preço (mais competitivo)
// Disponibilidade: melhor = MAIOR ratio (mais disponível)
// CSAT: melhor = MAIOR score

function rankStoresByIndicator(
  stores: StoreWithPlan[],
  indicator: 'price' | 'availability' | 'csat'
): Map<string, number> {
  const sorted = [...stores].sort((a, b) => {
    if (indicator === 'price') return a.basketPrice - b.basketPrice; // ASC
    if (indicator === 'availability') return (b.stockAvailable / b.expectedDemand) - (a.stockAvailable / a.expectedDemand); // DESC
    return b.csatScore - a.csatScore; // DESC
  });

  const rankMap = new Map<string, number>();
  sorted.forEach((store, index) => rankMap.set(store.storeId, 4 - index));
  return rankMap;
}
```

---

### 🔴 US-19 — Quebras e Aging

**Módulo:** `src/engine/services/shrinkage.service.ts`

#### Tasks:

| # | Task | Esforço |
|---|---|---|
| 19.1 | Criar `ShrinkageService` com método `calculate(decision: PoCategoryDecision, category: Category): ShrinkageResult` | 1h |
| 19.2 | Implementar: `stockResidual = stockPurchased - stockSold` | 30min |
| 19.3 | Implementar: `breakageUnits = stockResidual * breakageRate` | 30min |
| 19.4 | Implementar: `agingUnits = stockResidual * agingRate` | 30min |
| 19.5 | Converter para R$: `breakageCost = breakageUnits * unitCost` | 30min |
| 19.6 | Garantir: resultado nunca negativo (`Math.max(0, ...)`) | 15min |
| 19.7 | Persistir em `PoCategoryDecision.breakageAmount` e `agingAmount` | 1h |
| 19.8 | Testes unitários: 1 caso por categoria (4 testes) + edge cases | 2h |

#### Tabela de seed esperada (validar antes de implementar):

| Categoria | Unit Cost | Breakage % | Aging % |
|---|---|---|---|
| PERECIVEIS | R$ 8,00 | 3,0% | 2,0% |
| MERCEARIA | R$ 5,00 | 1,0% | 0,0% |
| ELETRO | R$ 120,00 | 0,2% | 5,0% |
| HIPEL | R$ 45,00 | 0,5% | 1,0% |

#### Exemplo de teste:

```typescript
it('PERECIVEIS: 100 comprados, 70 vendidos → 0.9 un de quebra', () => {
  const result = service.calculate({
    stockPurchased: 100,
    stockSold: 70,
  }, {
    breakageRate: 0.03,
    agingRate: 0.02,
    unitCost: 8,
  });

  expect(result.breakageUnits).toBeCloseTo(0.9);   // 30 * 3%
  expect(result.breakageCost).toBeCloseTo(7.2);    // 0.9 * 8
  expect(result.agingUnits).toBeCloseTo(0.6);      // 30 * 2%
  expect(result.agingCost).toBeCloseTo(4.8);       // 0.6 * 8
});
```

---

### 🔴 US-20 — Calcular EBITDA Completo

**Módulo:** `src/engine/services/financial.service.ts`

> ⚠️ **Esta é a US mais complexa.** Depende de US-17, US-18 e US-19.

#### Tasks:

| # | Task | Esforço |
|---|---|---|
| 20.1 | Criar `FinancialService` com método `calculateEbitda(input: EbitdaInput): EbitdaBreakdown` | 1.5h |
| 20.2 | Implementar Receita Bruta por categoria e agregada | 1h |
| 20.3 | Implementar Impostos por categoria (tax_rate variável) | 1h |
| 20.4 | Implementar Custo de Venda (demanda × unit_cost) | 30min |
| 20.5 | Implementar Margem Bruta e Margem Líquida (após quebras/aging) | 1h |
| 20.6 | Implementar Folha de Pagamento (cashier × 2000 + service × 2500) | 30min |
| 20.7 | Implementar Licenças (somar `monthlyLicenseDelta` dos CAPEXs implementados) | 1h |
| 20.8 | Implementar Juros Excedente (`MAX(0, (cash - 700k) × 1%)`) | 30min |
| 20.9 | Implementar SLA Perdas (receber de `SlaService` como input) | 1h |
| 20.10 | Calcular `ebitda` e `ebitdaPercentage` finais | 30min |
| 20.11 | Persistir resultado em `RoundResult` com breakdown completo | 1.5h |
| 20.12 | Testes unitários: 15 casos (cenário ideal, ruim, com SLA, com juros...) | 4h |

#### Interface EbitdaInput:

```typescript
interface EbitdaInput {
  // Demanda (vem de DemandService)
  demandAbsoluta: number;

  // Decisões do PO (vem do BD)
  categoryDecisions: {
    categoryId: string;
    stockPurchased: number;
    stockSold: number;
    priceMargin: number;
    unitCost: number;
    taxRate: number;
    breakageRate: number;
    agingRate: number;
  }[];

  // Operadores
  cashierOperators: number;
  serviceOperators: number;

  // CAPEXs implementados
  capexDecisions: {
    implemented: boolean;
    monthlyLicenseDelta: number;
  }[];

  // Caixa disponível (para cálculo de juros)
  cashAvailable: number;

  // SLA Perdas (vem de SlaService, pode ser 0)
  slaRevenueLost: number;
}
```

#### EbitdaBreakdown (saída para RoundResult):

```typescript
interface EbitdaBreakdown {
  grossRevenue: number;
  taxAmount: number;
  netRevenue: number;
  costOfGoodsSold: number;
  grossMargin: number;
  breakageCost: number;
  agingCost: number;
  netMargin: number;
  payrollCost: number;
  maintenanceCost: number;
  licensesCost: number;
  excessCashInterest: number;
  slaRevenueLost: number;
  ebitda: number;
  ebitdaPercentage: number;
}
```

---

### 🔴 US-21 — Aplicar Eventos de SLA

**Módulo:** `src/engine/services/sla.service.ts`

#### Tasks:

| # | Task | Esforço |
|---|---|---|
| 21.1 | Criar `SlaService` com método `applyEvents(stores: StoreWithCapex[], roundSeed: string): SlaEventResult[]` | 1.5h |
| 21.2 | Mapear CAPEXs não implementados por loja | 30min |
| 21.3 | Implementar sorteio determinístico com `seededRandom(storeId + capexType + round)` | 2h |
| 21.4 | Implementar cálculo de impacto por tipo de CAPEX | 1.5h |
| 21.5 | Persistir `SlaEvent` no BD para cada evento ocorrido | 1h |
| 21.6 | Retornar `slaRevenueLost` total por loja (input para `FinancialService`) | 30min |
| 21.7 | Testes: 4 cenários (nenhum CAPEX, todos CAPEX, 1 evento, 1000 sorteios = 15%) | 3h |

#### Sorteio Determinístico:

```typescript
// Por que determinístico? Para que sessões de replay/debug
// produzam exatamente os mesmos resultados.
function seededRandom(seed: string): number {
  // Usar hash simples do seed para gerar número 0-1 reproduzível
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash) / 2147483647; // Normalizar para 0-1
}

// Uso:
const random = seededRandom(`${storeId}-${capexType}-${round}`);
const eventOccurred = random < capex.slaRisk;
```

#### Mapa de impactos:

```typescript
const SLA_IMPACT_MAP = {
  SECURITY: (grossRevenue: number) => grossRevenue * 0.02,  // 2% receita
  FREEZER: () => 0, // Impacto em aging, não em receita diretamente
  NETWORK: (hourlyRevenue: number) => hourlyRevenue * 1,    // 1h parada
};
```

---

### 🟡 US-22 — Processar Transferência de Jogadores

**Módulo:** `src/stores/services/transfer.service.ts`

> Este módulo fica em `stores/` pois é um serviço de domínio da loja, não do motor financeiro.

#### Tasks:

| # | Task | Esforço |
|---|---|---|
| 22.1 | Criar `TransferService` com método `transfer(dto: TransferDto): PlayerTransfer` | 1h |
| 22.2 | Validar: sessão no status `RECONFIGURATION` | 30min |
| 22.3 | Validar: `fromStore.transferCount <= 2` (contar transfers existentes) | 1h |
| 22.4 | Validar: não é `STORE_MANAGER` | 30min |
| 22.5 | Validar: destino não tem o mesmo papel (`StoreRole`) | 1h |
| 22.6 | Atualizar `StoreMember.storeId` para loja destino | 30min |
| 22.7 | Registrar `PlayerTransfer` no BD | 30min |
| 22.8 | Emitir WebSocket `player:transferred` para ambas as lojas | 1h |
| 22.9 | Testes: 4 casos (válido, STORE_MANAGER, limite atingido, papel duplicado) | 2h |

---

## 4. Orquestrador: EngineService

`src/engine/services/engine.service.ts` é o **maestro** que chama todos os outros serviços na ordem correta.

```typescript
@Injectable()
export class EngineService {
  constructor(
    private readonly slaService: SlaService,
    private readonly csatService: CsatService,
    private readonly demandService: DemandService,
    private readonly shrinkageService: ShrinkageService,
    private readonly financialService: FinancialService,
    private readonly resultService: ResultService,
    private readonly gateway: AppGateway,
  ) {}

  async runRound(sessionId: string, round: number): Promise<void> {
    // 1. Buscar todas as lojas com seus planos confirmados
    const stores = await this.loadConfirmedPlans(sessionId, round);

    // 2. Aplicar eventos SLA (ANTES dos cálculos financeiros)
    const slaResults = await this.slaService.applyEvents(stores, `${sessionId}-${round}`);

    // 3. Calcular CSAT para cada loja
    const csatResults = stores.map(store => ({
      storeId: store.id,
      csat: this.csatService.calculate(store.plan.cashierOperators, store.quizScore),
    }));

    // 4. Distribuir demanda
    const demandResults = this.demandService.distribute(stores.map(store => ({
      storeId: store.id,
      stockAvailable: store.plan.totalStock,
      basketPrice: store.plan.avgBasketPrice,
      csatScore: csatResults.find(c => c.storeId === store.id)!.csat,
      expectedDemand: store.session.expectedDemand,
    })));

    // 5. Calcular EBITDA (depende de SLA + demanda + quebras)
    const ebitdaResults = await Promise.all(
      stores.map(store => this.financialService.calculateEbitda({
        demandAbsoluta: demandResults.find(d => d.storeId === store.id)!.demandAbsoluta,
        categoryDecisions: store.plan.categoryDecisions,
        cashierOperators: store.plan.cashierOperators,
        serviceOperators: store.plan.serviceOperators,
        capexDecisions: store.plan.capexDecisions,
        cashAvailable: store.cash,
        slaRevenueLost: slaResults.find(s => s.storeId === store.id)?.revenueLost ?? 0,
      }))
    );

    // 6. Persistir todos os resultados
    await this.resultService.persistRoundResults(sessionId, round, ebitdaResults);

    // 7. Broadcast via WebSocket
    this.gateway.emitToSession(sessionId, 'round:results', {
      round,
      results: ebitdaResults,
      ranking: this.buildRanking(ebitdaResults),
    });
  }
}
```

---

## 5. Estrutura de Arquivos do Motor

```
src/engine/
├── engine.module.ts
├── engine.service.ts           ← Orquestrador (US não específica)
├── services/
│   ├── csat.service.ts         ← US-17
│   ├── demand.service.ts       ← US-18
│   ├── shrinkage.service.ts    ← US-19
│   ├── financial.service.ts    ← US-20
│   └── sla.service.ts          ← US-21
├── interfaces/
│   ├── demand-result.interface.ts
│   ├── ebitda-input.interface.ts
│   ├── ebitda-breakdown.interface.ts
│   └── sla-result.interface.ts
├── constants.ts                ← Constantes de negócio centralizadas
└── __tests__/
    ├── csat.service.spec.ts
    ├── demand.service.spec.ts
    ├── shrinkage.service.spec.ts
    ├── financial.service.spec.ts
    ├── sla.service.spec.ts
    └── engine.integration.spec.ts  ← Teste de ponta a ponta
```

---

## 6. Ordem de Implementação Recomendada

```
Semana 1 (base do motor):
  Day 1-2: Estrutura do módulo + constants.ts + interfaces
  Day 3:   US-17 (CSAT) — mais simples, bom para ganhar ritmo
  Day 4-5: US-19 (Quebras/Aging) — cálculo isolado, sem dependências

Semana 2 (core do motor):
  Day 1-2: US-18 (Demanda) — requer US-17 pronto
  Day 3-5: US-20 (EBITDA) — requer US-18 + US-19

Semana 3 (finalização):
  Day 1-2: US-21 (SLA) — paralelo ao US-20, integra no final
  Day 3:   EngineService (orquestrador) — integra tudo
  Day 4-5: US-22 (Transfer) + teste de integração completo
```

---

## 7. Teste de Integração Final

`src/engine/__tests__/engine.integration.spec.ts`

Este teste valida o sistema completo de ponta a ponta:

```typescript
describe('EngineService — Integration', () => {
  it('deve processar 4 lojas por 3 rodadas e produzir ranking válido', async () => {
    // Setup: 4 lojas com planos variados
    const session = await createTestSession();
    const stores = await createTestStores(session, 4);

    // Rodada 1
    await engineService.runRound(session.id, 1);
    const results1 = await resultService.getByRound(session.id, 1);

    // Validações:
    expect(results1).toHaveLength(4);
    expect(results1.reduce((sum, r) => sum + r.demandShare, 0)).toBeCloseTo(1); // soma = 100%
    results1.forEach(r => {
      expect(r.ebitdaPercentage).toBeGreaterThan(-1); // Entre -100% e +100%
      expect(r.grossRevenue).toBeGreaterThanOrEqual(0);
    });
  });
});
```

---

## 8. Checklist de Entrega do Motor

Antes de dar como concluído o Épico 4:

- [ ] Todos os 6 serviços implementados (CSAT, Demand, Shrinkage, Financial, SLA, Transfer)
- [ ] `EngineService.runRound()` funcionando de ponta a ponta
- [ ] Cobertura de testes unitários ≥ 80% no módulo `engine/`
- [ ] Teste de integração passando com 4 lojas e 3 rodadas
- [ ] Seed validado: CATEGORY e CAPEX_OPTION corretos no BD
- [ ] WebSocket emitindo `round:results` após execução
- [ ] Nenhum `any` solto nas interfaces do motor (TypeScript strict)
- [ ] Nenhuma constante de negócio hardcoded fora de `constants.ts`

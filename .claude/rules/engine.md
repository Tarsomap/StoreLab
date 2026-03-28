---
paths:
  - "backend/src/engine/**/*.ts"
---

# Engine Rules — Motor de Cálculo

## Ordem de dependência
CSAT → Demanda → Quebras/Aging → EBITDA → SLA → Transfer
Nunca implementar um serviço sem que suas dependências estejam prontas.

## Fórmulas (fonte: spec.md v1.1)

### CSAT
```
CSAT = (cashierOperators / 10) * (quizScorePercentage)
// quizScorePercentage como decimal (0.0 a 1.0)
// Resultado: 0.0 a 1.0
```

### Demanda
```
Indicadores por loja: Disponibilidade, Preço da Cesta (inverso), CSAT
Ranking 1-4 por indicador (4 = melhor)
Pontos loja = soma dos 3 rankings
Demand Share = pontos_loja / soma_total_pontos
Demanda Absoluta = Demand Share × totalDemand da sessão
```

### Quebras e Aging
```
SOMENTE calculados no fim da rodada 3
Estoque residual = stockPurchased - stockSold (acumulado 3 rodadas)
Quebras = estoqueResidual × breakageRate × unitCost
Aging = estoqueResidual × agingRate × unitCost
Nunca negativo: Math.max(0, ...)
```

### EBITDA
```
grossRevenue = Σ(qtdVendida × preçoDeVenda) por categoria
taxAmount = Σ(grossRevenue_cat × taxRate_cat)
netRevenue = grossRevenue - taxAmount
costOfGoods = Σ(qtdVendida × unitCost)
payroll = (cashierOps × 1000) + (serviceOps × 1200)
maintenance = FREEZER implementado ? 0 : 400
licenses = 1200 + Σ(capex.monthlyLicenseDelta dos implementados)
// base 1200 = 120(SO) + 80(PDV) + 500(Site) + 500(Segurança) — spec.md §8
interest = MAX(0, cashUsed - 700000) × 0.12
slaLoss = Σ(SlaEvent.revenueLost)
ebitda = netRevenue - costOfGoods - breakage - aging - payroll - maintenance - licenses - interest - slaLoss
ebitda% = ebitda / grossRevenue
```

### SLA
```
Para cada CAPEX não implementado:
  seed = hash(`${sessionId}-${storeId}-${round}-${capexType}`)
  if (seededRandom < capex.slaRiskPercent):
    diasParados = capex.downtimeFixedDays + SLA_TABLE[serviceOperators]
    revenueLost = (grossRevenue / 30) × diasParados
NUNCA usar Math.random() — sempre hash determinístico
```

## Estrutura de arquivos esperada
```
engine/
├── engine.module.ts
├── engine.service.ts        ← Orquestrador: runRound()
├── constants.ts             ← Todas as constantes de negócio
├── interfaces/              ← Tipos: EbitdaInput, EbitdaBreakdown, etc.
├── csat.service.ts
├── demand.service.ts
├── shrinkage.service.ts
├── financial.service.ts
├── sla.service.ts
└── __tests__/               ← Mínimo 80% de cobertura
```

## Regras
- Cada serviço é puro (recebe inputs, retorna outputs) — sem acesso direto ao BD
- Apenas EngineService e ResultsService acessam Prisma
- Testes: mínimo 10 casos por serviço, incluindo edge cases (zero, negativo, empate)

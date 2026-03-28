import { FinancialService } from '../financial.service';
import {
  CategoryEngineInput,
  CapexEngineInput,
  CategoryRevenueResult,
  EbitdaInput,
  ShrinkageResult,
} from '../interfaces';
import {
  BASE_LICENSE_COST,
  LIC_OS,
  LIC_PDV,
  LIC_SITE,
  LIC_SECURITY,
  CASHIER_SALARY,
  SERVICE_SALARY,
  MAINTENANCE_COST,
  INTEREST_RATE_MONTHLY,
} from '../constants';

describe('FinancialService', () => {
  let service: FinancialService;

  beforeEach(() => {
    service = new FinancialService();
  });

  const makeCat = (overrides: Partial<CategoryEngineInput> = {}): CategoryEngineInput => ({
    categoryId: 'cat-1',
    categoryName: 'MERCEARIA',
    unitCost: 30,
    taxRate: 0.07,
    breakageRate: 0.015,
    agingRate: 0.008,
    sessionStockAvailable: 1000,
    stockPurchased: 300,
    priceMargin: 0.3,
    ...overrides,
  });

  const emptyShrinkage: ShrinkageResult = { categories: [], totalBreakage: 0, totalAging: 0 };

  const makeCapex = (overrides: Partial<CapexEngineInput> = {}): CapexEngineInput => ({
    capexOptionId: 'capex-1',
    type: 'SECURITY',
    acquisitionCost: 50000,
    downtimeFixedDays: 2,
    monthlyLicenseDelta: 100,
    maintenanceSaving: 0,
    slaRiskPercent: 0.15,
    implemented: false,
    ...overrides,
  });

  const makeEbitdaInput = (overrides: Partial<EbitdaInput> = {}): EbitdaInput => ({
    categoryRevenues: [],
    cashierOperators: 5,
    serviceOperators: 2,
    capexDecisions: [],
    cashUsed: 500_000,
    interestThreshold: 700_000,
    slaRevenueLost: 0,
    shrinkage: emptyShrinkage,
    ...overrides,
  });

  // ─── computeCategoryRevenues ─────────────────────────────────────────────────

  describe('computeCategoryRevenues', () => {
    it('computes revenue correctly for standard share (0.25)', () => {
      // demandShare=0.25, sessionStockAvailable=1000
      // maxSellable = 1000 × 0.25 = 250
      // stockSold = min(300, 250) = 250
      // salePrice = 30 × 1.3 = 39
      // grossRevenue = 250 × 39 = 9750
      // taxAmount = 9750 × 0.07 = 682.5
      // costOfGoods = 250 × 30 = 7500
      const result = service.computeCategoryRevenues([makeCat()], 0.25);
      expect(result[0].stockSold).toBeCloseTo(250);
      expect(result[0].unsoldStock).toBeCloseTo(50);
      expect(result[0].grossRevenue).toBeCloseTo(9750);
      expect(result[0].taxAmount).toBeCloseTo(682.5);
      expect(result[0].costOfGoods).toBeCloseTo(7500);
    });

    it('stockSold is capped at sessionStockAvailable × demandShare', () => {
      // stockPurchased=500 but maxSellable=1000×0.25=250 → stockSold=250
      const result = service.computeCategoryRevenues(
        [makeCat({ stockPurchased: 500, sessionStockAvailable: 1000 })],
        0.25,
      );
      expect(result[0].stockSold).toBeCloseTo(250);
      expect(result[0].unsoldStock).toBeCloseTo(250);
    });

    it('stockSold does not exceed stockPurchased even with high demandShare', () => {
      // stockPurchased=200 < maxSellable=1000×1.0=1000 → stockSold=200
      const result = service.computeCategoryRevenues(
        [makeCat({ stockPurchased: 200, sessionStockAvailable: 1000 })],
        1.0,
      );
      expect(result[0].stockSold).toBeCloseTo(200);
      expect(result[0].unsoldStock).toBeCloseTo(0);
    });

    it('returns zeros when demandShare is 0', () => {
      const result = service.computeCategoryRevenues([makeCat()], 0);
      expect(result[0].stockSold).toBe(0);
      expect(result[0].grossRevenue).toBe(0);
      expect(result[0].taxAmount).toBe(0);
      expect(result[0].costOfGoods).toBe(0);
      expect(result[0].unsoldStock).toBeCloseTo(300); // all unsold
    });

    it('returns zeros for all fields when stockPurchased is 0', () => {
      const result = service.computeCategoryRevenues(
        [makeCat({ stockPurchased: 0 })],
        0.5,
      );
      expect(result[0].stockSold).toBe(0);
      expect(result[0].grossRevenue).toBe(0);
      expect(result[0].costOfGoods).toBe(0);
    });

    it('handles multiple categories independently', () => {
      const cats: CategoryEngineInput[] = [
        makeCat({ categoryId: 'cat-1', stockPurchased: 200, unitCost: 20, priceMargin: 0.5, taxRate: 0.12 }),
        makeCat({ categoryId: 'cat-2', stockPurchased: 100, unitCost: 500, priceMargin: 0.25, taxRate: 0.25, sessionStockAvailable: 700 }),
      ];
      const results = service.computeCategoryRevenues(cats, 1.0);
      // cat-1: stockSold=200 (capped at purchased), grossRevenue=200×20×1.5=6000, tax=6000×0.12=720
      expect(results[0].grossRevenue).toBeCloseTo(6000);
      expect(results[0].taxAmount).toBeCloseTo(720);
      // cat-2: stockSold=100, grossRevenue=100×500×1.25=62500, tax=62500×0.25=15625
      expect(results[1].grossRevenue).toBeCloseTo(62500);
      expect(results[1].taxAmount).toBeCloseTo(15625);
    });

    it('preserves categoryId in result', () => {
      const result = service.computeCategoryRevenues(
        [makeCat({ categoryId: 'pereciveis' })],
        0.5,
      );
      expect(result[0].categoryId).toBe('pereciveis');
    });
  });

  // ─── computeEbitda ───────────────────────────────────────────────────────────

  describe('computeEbitda', () => {
    const makeCategoryRevenue = (
      overrides: Partial<CategoryRevenueResult> = {},
    ): CategoryRevenueResult => ({
      categoryId: 'cat-1',
      stockSold: 250,
      unsoldStock: 50,
      grossRevenue: 9750,
      taxAmount: 682.5,
      costOfGoods: 7500,
      ...overrides,
    });

    it('computes EBITDA correctly for a simple profitable scenario', () => {
      // grossRevenue=9750, taxAmount=682.5, netRevenue=9067.5
      // costOfGoods=7500
      // cashierOps=5, serviceOps=2 → payroll = 5×1000 + 2×1200 = 7400
      // no CAPEX → maintenanceCost=400, licenseCost=1200 (120+80+500+500)
      // cashUsed=500k (< 700k threshold) → interestCost=0
      // slaRevenueLost=0, shrinkage=0
      // ebitda = 9067.5 - 7500 - 0 - 0 - 7400 - 400 - 1200 - 0 - 0 = -7432.5
      const input = makeEbitdaInput({
        categoryRevenues: [makeCategoryRevenue()],
      });
      const result = service.computeEbitda(input);
      expect(result.grossRevenue).toBeCloseTo(9750);
      expect(result.taxAmount).toBeCloseTo(682.5);
      expect(result.netRevenue).toBeCloseTo(9067.5);
      expect(result.costOfGoods).toBeCloseTo(7500);
      expect(result.payrollCost).toBeCloseTo(7400);
      expect(result.maintenanceCost).toBe(MAINTENANCE_COST);
      expect(result.licenseCost).toBe(BASE_LICENSE_COST); // 1200
      expect(result.interestCost).toBe(0);
      expect(result.ebitda).toBeCloseTo(-7432.5);
    });

    it('maintenanceCost is 0 when FREEZER is implemented', () => {
      const input = makeEbitdaInput({
        categoryRevenues: [makeCategoryRevenue()],
        capexDecisions: [makeCapex({ type: 'FREEZER', implemented: true, monthlyLicenseDelta: 0 })],
      });
      const result = service.computeEbitda(input);
      expect(result.maintenanceCost).toBe(0);
    });

    it('maintenanceCost is 400 when FREEZER is NOT implemented', () => {
      const input = makeEbitdaInput({
        categoryRevenues: [makeCategoryRevenue()],
        capexDecisions: [makeCapex({ type: 'FREEZER', implemented: false })],
      });
      const result = service.computeEbitda(input);
      expect(result.maintenanceCost).toBe(MAINTENANCE_COST);
    });

    it('adds monthlyLicenseDelta to licenseCost for implemented CAPEXes', () => {
      const input = makeEbitdaInput({
        categoryRevenues: [makeCategoryRevenue()],
        capexDecisions: [
          makeCapex({ type: 'SECURITY',       implemented: true,  monthlyLicenseDelta: 100 }),
          makeCapex({ capexOptionId: 'c2', type: 'SITE', implemented: true,  monthlyLicenseDelta: 150 }),
          makeCapex({ capexOptionId: 'c3', type: 'NETWORK', implemented: false, monthlyLicenseDelta: 999 }),
        ],
      });
      const result = service.computeEbitda(input);
      // licenseCost = 1200 (base) + 100 + 150 = 1450 (not-implemented excluded)
      expect(result.licenseCost).toBeCloseTo(1450);
    });

    it('computes interest cost when cashUsed exceeds threshold', () => {
      // cashUsed=900000, interestThreshold=700000
      // interestCost = (900000-700000) × 0.12 = 24000
      const input = makeEbitdaInput({
        categoryRevenues: [makeCategoryRevenue()],
        cashUsed: 900_000,
        interestThreshold: 700_000,
      });
      const result = service.computeEbitda(input);
      expect(result.interestCost).toBeCloseTo(24_000);
    });

    it('interestCost is 0 when cashUsed is below threshold', () => {
      const input = makeEbitdaInput({
        categoryRevenues: [makeCategoryRevenue()],
        cashUsed: 600_000,
        interestThreshold: 700_000,
      });
      const result = service.computeEbitda(input);
      expect(result.interestCost).toBe(0);
    });

    it('includes SLA revenue loss in EBITDA calculation', () => {
      const input = makeEbitdaInput({
        categoryRevenues: [makeCategoryRevenue()],
        slaRevenueLost: 2000,
      });
      const resultWithSla = service.computeEbitda(input);
      const resultNoSla = service.computeEbitda({ ...input, slaRevenueLost: 0 });
      expect(resultWithSla.ebitda).toBeCloseTo(resultNoSla.ebitda - 2000);
    });

    it('includes shrinkage amounts in EBITDA calculation', () => {
      const shrinkage: ShrinkageResult = {
        categories: [],
        totalBreakage: 500,
        totalAging: 300,
      };
      const input = makeEbitdaInput({
        categoryRevenues: [makeCategoryRevenue()],
        shrinkage,
      });
      const result = service.computeEbitda(input);
      expect(result.breakageAmount).toBe(500);
      expect(result.agingAmount).toBe(300);
      const noShrinkageResult = service.computeEbitda({ ...input, shrinkage: emptyShrinkage });
      expect(result.ebitda).toBeCloseTo(noShrinkageResult.ebitda - 800);
    });

    it('ebitdaPercentage is 0 when grossRevenue is 0', () => {
      const input = makeEbitdaInput({ categoryRevenues: [] });
      const result = service.computeEbitda(input);
      expect(result.grossRevenue).toBe(0);
      expect(result.ebitdaPercentage).toBe(0);
    });

    it('ebitdaPercentage equals ebitda / grossRevenue', () => {
      const input = makeEbitdaInput({
        categoryRevenues: [
          makeCategoryRevenue({ grossRevenue: 100_000, taxAmount: 7_000, costOfGoods: 40_000 }),
        ],
        cashierOperators: 3,
        serviceOperators: 1,
        capexDecisions: [],
        cashUsed: 600_000,
        interestThreshold: 700_000,
        slaRevenueLost: 0,
        shrinkage: emptyShrinkage,
      });
      const result = service.computeEbitda(input);
      expect(result.ebitdaPercentage).toBeCloseTo(result.ebitda / result.grossRevenue);
    });

    it('BASE_LICENSE_COST is sum of 4 fixed license components', () => {
      // spec.md §8: SO(120) + PDV(80) + Site(500) + Segurança(500) = 1200
      expect(LIC_OS).toBe(120);
      expect(LIC_PDV).toBe(80);
      expect(LIC_SITE).toBe(500);
      expect(LIC_SECURITY).toBe(500);
      expect(BASE_LICENSE_COST).toBe(LIC_OS + LIC_PDV + LIC_SITE + LIC_SECURITY);
      expect(BASE_LICENSE_COST).toBe(1200);
    });

    it('exemplo PO: SECURITY+FREEZER+NETWORK+SITE implementados → licenseCost = 1450', () => {
      // Cenário: 10 op caixa, 5 op serviço, todos CAPEX exceto AUTOMATION e SELF_CHECKOUT
      // Deltas implementados: SECURITY(+100) + FREEZER(+0) + NETWORK(+0) + SITE(+150) = +250
      // licenseCost = 1200 + 250 = 1450
      // FREEZER implementado → maintenanceCost = 0
      const input = makeEbitdaInput({
        categoryRevenues: [],
        cashierOperators: 10,
        serviceOperators: 5,
        capexDecisions: [
          makeCapex({ type: 'SECURITY',      implemented: true,  monthlyLicenseDelta: 100 }),
          makeCapex({ capexOptionId: 'c2', type: 'FREEZER',    implemented: true,  monthlyLicenseDelta: 0 }),
          makeCapex({ capexOptionId: 'c3', type: 'NETWORK',    implemented: true,  monthlyLicenseDelta: 0 }),
          makeCapex({ capexOptionId: 'c4', type: 'SITE',       implemented: true,  monthlyLicenseDelta: 150 }),
          makeCapex({ capexOptionId: 'c5', type: 'SELF_CHECKOUT', implemented: false, monthlyLicenseDelta: 320 }),
          makeCapex({ capexOptionId: 'c6', type: 'AUTOMATION', implemented: false, monthlyLicenseDelta: 0 }),
        ],
      });
      const result = service.computeEbitda(input);
      expect(result.licenseCost).toBe(1450);
      expect(result.maintenanceCost).toBe(0); // FREEZER implementado
    });

    it('payrollCost uses correct salary constants', () => {
      const input = makeEbitdaInput({
        categoryRevenues: [makeCategoryRevenue()],
        cashierOperators: 4,
        serviceOperators: 3,
      });
      const result = service.computeEbitda(input);
      // 4×1000 + 3×1200 = 4000 + 3600 = 7600
      expect(result.payrollCost).toBe(4 * CASHIER_SALARY + 3 * SERVICE_SALARY);
    });
  });
});

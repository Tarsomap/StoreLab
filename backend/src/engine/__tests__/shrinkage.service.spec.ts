import { ShrinkageService } from '../shrinkage.service';
import { ShrinkageCategoryInput } from '../interfaces';

describe('ShrinkageService', () => {
  let service: ShrinkageService;

  beforeEach(() => {
    service = new ShrinkageService();
  });

  const makeInput = (
    overrides: Partial<ShrinkageCategoryInput> = {},
  ): ShrinkageCategoryInput => ({
    categoryId: 'cat-1',
    unitCost: 30,
    breakageRate: 0.015,
    agingRate: 0.008,
    totalUnsold: 1000,
    ...overrides,
  });

  // ─── empty() ─────────────────────────────────────────────────────────────────

  describe('empty()', () => {
    it('returns zero totals', () => {
      const result = service.empty();
      expect(result.totalBreakage).toBe(0);
      expect(result.totalAging).toBe(0);
    });

    it('returns empty categories array', () => {
      const result = service.empty();
      expect(result.categories).toHaveLength(0);
    });
  });

  // ─── compute() ───────────────────────────────────────────────────────────────

  describe('compute()', () => {
    it('computes breakage and aging for single category', () => {
      // unsold=1000, unitCost=30, breakageRate=0.015, agingRate=0.008
      // breakage = 1000 × 30 × 0.015 = 450
      // aging    = 1000 × 30 × 0.008 = 240
      const result = service.compute([makeInput()]);
      expect(result.categories[0].breakageAmount).toBeCloseTo(450);
      expect(result.categories[0].agingAmount).toBeCloseTo(240);
    });

    it('returns correct totals across multiple categories', () => {
      const inputs: ShrinkageCategoryInput[] = [
        makeInput({ categoryId: 'cat-1', totalUnsold: 1000, unitCost: 30, breakageRate: 0.015, agingRate: 0.008 }),
        makeInput({ categoryId: 'cat-2', totalUnsold: 500,  unitCost: 20, breakageRate: 0.020, agingRate: 0.058 }),
      ];
      // cat-1: breakage=450, aging=240
      // cat-2: breakage=500*20*0.02=200, aging=500*20*0.058=580
      const result = service.compute(inputs);
      expect(result.totalBreakage).toBeCloseTo(650);
      expect(result.totalAging).toBeCloseTo(820);
    });

    it('returns zero breakage and aging when totalUnsold is 0', () => {
      const result = service.compute([makeInput({ totalUnsold: 0 })]);
      expect(result.categories[0].breakageAmount).toBe(0);
      expect(result.categories[0].agingAmount).toBe(0);
      expect(result.totalBreakage).toBe(0);
      expect(result.totalAging).toBe(0);
    });

    it('clamps negative totalUnsold to 0', () => {
      const result = service.compute([makeInput({ totalUnsold: -500 })]);
      expect(result.categories[0].breakageAmount).toBe(0);
      expect(result.categories[0].agingAmount).toBe(0);
    });

    it('ELETRO has 0% breakage rate — breakageAmount is always 0', () => {
      const result = service.compute([
        makeInput({ categoryId: 'eletro', unitCost: 500, breakageRate: 0.0, agingRate: 0.013, totalUnsold: 100 }),
      ]);
      // breakage = 100 × 500 × 0.0 = 0
      // aging    = 100 × 500 × 0.013 = 650
      expect(result.categories[0].breakageAmount).toBe(0);
      expect(result.categories[0].agingAmount).toBeCloseTo(650);
    });

    it('handles empty input array', () => {
      const result = service.compute([]);
      expect(result.categories).toHaveLength(0);
      expect(result.totalBreakage).toBe(0);
      expect(result.totalAging).toBe(0);
    });

    it('preserves categoryId in each result', () => {
      const inputs: ShrinkageCategoryInput[] = [
        makeInput({ categoryId: 'pereciveis', totalUnsold: 200 }),
        makeInput({ categoryId: 'mercearia',  totalUnsold: 300 }),
      ];
      const result = service.compute(inputs);
      expect(result.categories[0].categoryId).toBe('pereciveis');
      expect(result.categories[1].categoryId).toBe('mercearia');
    });

    it('totalBreakage equals sum of individual breakageAmounts', () => {
      const inputs: ShrinkageCategoryInput[] = [
        makeInput({ categoryId: 'cat-1', totalUnsold: 400, unitCost: 30, breakageRate: 0.015 }),
        makeInput({ categoryId: 'cat-2', totalUnsold: 200, unitCost: 20, breakageRate: 0.020 }),
        makeInput({ categoryId: 'cat-3', totalUnsold: 100, unitCost: 45, breakageRate: 0.010 }),
      ];
      const result = service.compute(inputs);
      const sumBreakage = result.categories.reduce((sum, c) => sum + c.breakageAmount, 0);
      expect(result.totalBreakage).toBeCloseTo(sumBreakage);
    });

    it('totalAging equals sum of individual agingAmounts', () => {
      const inputs: ShrinkageCategoryInput[] = [
        makeInput({ categoryId: 'cat-1', totalUnsold: 400, unitCost: 30, agingRate: 0.008 }),
        makeInput({ categoryId: 'cat-2', totalUnsold: 200, unitCost: 20, agingRate: 0.058 }),
      ];
      const result = service.compute(inputs);
      const sumAging = result.categories.reduce((sum, c) => sum + c.agingAmount, 0);
      expect(result.totalAging).toBeCloseTo(sumAging);
    });

    it('computes PERECIVEIS category correctly (high aging rate)', () => {
      // PERECIVEIS: unitCost=20, breakageRate=0.020, agingRate=0.058
      const result = service.compute([
        makeInput({ categoryId: 'pereciveis', unitCost: 20, breakageRate: 0.020, agingRate: 0.058, totalUnsold: 500 }),
      ]);
      // breakage = 500 × 20 × 0.020 = 200
      // aging    = 500 × 20 × 0.058 = 580
      expect(result.categories[0].breakageAmount).toBeCloseTo(200);
      expect(result.categories[0].agingAmount).toBeCloseTo(580);
    });
  });
});

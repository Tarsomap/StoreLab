import { DemandService } from '../demand.service';
import { CategoryEngineInput, StoreIndicators } from '../interfaces';

describe('DemandService', () => {
  let service: DemandService;

  beforeEach(() => {
    service = new DemandService();
  });

  const makeCategory = (
    overrides: Partial<CategoryEngineInput> = {},
  ): CategoryEngineInput => ({
    categoryId: 'cat-1',
    categoryName: 'MERCEARIA',
    unitCost: 30,
    taxRate: 0.07,
    breakageRate: 0.015,
    agingRate: 0.008,
    sessionStockAvailable: 6000,
    stockPurchased: 3000,
    priceMargin: 0.3,
    ...overrides,
  });

  // ─── computeAvailability ──────────────────────────────────────────────────

  describe('computeAvailability', () => {
    it('computes standard availability across two categories', () => {
      const cats: CategoryEngineInput[] = [
        makeCategory({ categoryId: 'cat-1', stockPurchased: 3000, sessionStockAvailable: 6000 }),
        makeCategory({ categoryId: 'cat-2', stockPurchased: 2000, sessionStockAvailable: 4000 }),
      ];
      // (3000+2000)/(6000+4000) = 5000/10000 = 0.5
      expect(service.computeAvailability(cats)).toBeCloseTo(0.5);
    });

    it('returns 0 when all sessionStockAvailable is 0', () => {
      const cats: CategoryEngineInput[] = [
        makeCategory({ sessionStockAvailable: 0, stockPurchased: 0 }),
      ];
      expect(service.computeAvailability(cats)).toBe(0);
    });

    it('returns 1 when store purchased all available stock', () => {
      const cats: CategoryEngineInput[] = [
        makeCategory({ stockPurchased: 6000, sessionStockAvailable: 6000 }),
      ];
      expect(service.computeAvailability(cats)).toBeCloseTo(1.0);
    });

    it('handles single category', () => {
      const cats: CategoryEngineInput[] = [
        makeCategory({ stockPurchased: 1500, sessionStockAvailable: 6000 }),
      ];
      // 1500/6000 = 0.25
      expect(service.computeAvailability(cats)).toBeCloseTo(0.25);
    });
  });

  // ─── computeBasketPrice ───────────────────────────────────────────────────

  describe('computeBasketPrice', () => {
    it('computes weighted average basket price', () => {
      const cats: CategoryEngineInput[] = [
        makeCategory({ categoryId: 'cat-1', stockPurchased: 1000, unitCost: 20, priceMargin: 0.5 }),
        makeCategory({ categoryId: 'cat-2', stockPurchased: 1000, unitCost: 40, priceMargin: 0.25 }),
      ];
      // cat-1: 1000 × 20 × 1.5 = 30000; cat-2: 1000 × 40 × 1.25 = 50000
      // total weighted = 80000; total qty = 2000; avg = 40
      expect(service.computeBasketPrice(cats)).toBeCloseTo(40);
    });

    it('returns 0 when all stockPurchased is 0', () => {
      const cats: CategoryEngineInput[] = [
        makeCategory({ stockPurchased: 0 }),
      ];
      expect(service.computeBasketPrice(cats)).toBe(0);
    });

    it('returns single category price when only one category', () => {
      const cats: CategoryEngineInput[] = [
        makeCategory({ stockPurchased: 500, unitCost: 30, priceMargin: 0.3 }),
      ];
      // 30 × 1.3 = 39
      expect(service.computeBasketPrice(cats)).toBeCloseTo(39);
    });

    it('computes correctly when prices are uniform', () => {
      const cats: CategoryEngineInput[] = [
        makeCategory({ categoryId: 'cat-1', stockPurchased: 100, unitCost: 50, priceMargin: 0.2 }),
        makeCategory({ categoryId: 'cat-2', stockPurchased: 200, unitCost: 50, priceMargin: 0.2 }),
      ];
      // All prices identical: 50 × 1.2 = 60
      expect(service.computeBasketPrice(cats)).toBeCloseTo(60);
    });
  });

  // ─── computeDemand ────────────────────────────────────────────────────────

  describe('computeDemand', () => {
    const makeStore = (storeId: string, csat: number, availability: number, basketPrice: number): StoreIndicators => ({
      storeId,
      csat,
      availability,
      basketPrice,
    });

    it('computes demand with 4 distinct stores', () => {
      const indicators: StoreIndicators[] = [
        makeStore('A', 0.8, 0.9, 100),
        makeStore('B', 0.6, 0.7, 120),
        makeStore('C', 0.4, 0.5, 80),
        makeStore('D', 0.2, 0.3, 110),
      ];
      const results = service.computeDemand(indicators);
      expect(results).toHaveLength(4);
      const total = results.reduce((sum, r) => sum + r.demandShare, 0);
      expect(total).toBeCloseTo(1.0);
    });

    it('best store on all indicators gets highest rankScore', () => {
      const indicators: StoreIndicators[] = [
        makeStore('A', 0.9, 0.9, 80),  // low price (best), high avail (best), high csat (best) = ranks 4+4+4=12
        makeStore('B', 0.5, 0.5, 100),
        makeStore('C', 0.3, 0.3, 120),
        makeStore('D', 0.1, 0.1, 140),
      ];
      const results = service.computeDemand(indicators);
      const storeA = results.find((r) => r.storeId === 'A')!;
      expect(storeA.rankScore).toBe(12);
    });

    it('sum of all rankScores is 30 for 4 stores with distinct values', () => {
      const indicators: StoreIndicators[] = [
        makeStore('A', 0.8, 0.9, 80),
        makeStore('B', 0.6, 0.7, 100),
        makeStore('C', 0.4, 0.5, 120),
        makeStore('D', 0.2, 0.3, 140),
      ];
      const results = service.computeDemand(indicators);
      const totalScore = results.reduce((sum, r) => sum + r.rankScore, 0);
      // 4 indicators × (1+2+3+4) = 3 × 10 = 30
      expect(totalScore).toBe(30);
    });

    it('assigns same rank to tied stores (price tie)', () => {
      const indicators: StoreIndicators[] = [
        makeStore('A', 0.8, 0.9, 100),
        makeStore('B', 0.6, 0.7, 100),  // same price as A
        makeStore('C', 0.4, 0.5, 80),
        makeStore('D', 0.2, 0.3, 120),
      ];
      const results = service.computeDemand(indicators);
      const storeA = results.find((r) => r.storeId === 'A')!;
      const storeB = results.find((r) => r.storeId === 'B')!;
      expect(storeA.priceRank).toBe(storeB.priceRank);
    });

    it('assigns same rank for availability ties', () => {
      const indicators: StoreIndicators[] = [
        makeStore('A', 0.8, 0.5, 100),
        makeStore('B', 0.6, 0.5, 120),  // same availability as A
        makeStore('C', 0.4, 0.8, 80),
        makeStore('D', 0.2, 0.2, 110),
      ];
      const results = service.computeDemand(indicators);
      const storeA = results.find((r) => r.storeId === 'A')!;
      const storeB = results.find((r) => r.storeId === 'B')!;
      expect(storeA.availabilityRank).toBe(storeB.availabilityRank);
    });

    it('assigns same rank for CSAT ties', () => {
      const indicators: StoreIndicators[] = [
        makeStore('A', 0.5, 0.9, 80),
        makeStore('B', 0.5, 0.7, 100),  // same csat as A
        makeStore('C', 0.8, 0.5, 120),
        makeStore('D', 0.2, 0.3, 140),
      ];
      const results = service.computeDemand(indicators);
      const storeA = results.find((r) => r.storeId === 'A')!;
      const storeB = results.find((r) => r.storeId === 'B')!;
      expect(storeA.csatRank).toBe(storeB.csatRank);
    });

    it('demandShare sums to approximately 1 when all stores are tied', () => {
      const indicators: StoreIndicators[] = [
        makeStore('A', 0.5, 0.5, 100),
        makeStore('B', 0.5, 0.5, 100),
        makeStore('C', 0.5, 0.5, 100),
        makeStore('D', 0.5, 0.5, 100),
      ];
      const results = service.computeDemand(indicators);
      const totalShare = results.reduce((sum, r) => sum + r.demandShare, 0);
      expect(totalShare).toBeCloseTo(1.0);
      // All stores should have equal share
      results.forEach((r) => expect(r.demandShare).toBeCloseTo(0.25));
    });

    it('handles single store', () => {
      const indicators: StoreIndicators[] = [
        makeStore('A', 0.5, 0.5, 100),
      ];
      const results = service.computeDemand(indicators);
      expect(results[0].demandShare).toBeCloseTo(1.0);
    });

    it('returns empty array for empty input', () => {
      const results = service.computeDemand([]);
      expect(results).toHaveLength(0);
    });

    it('lower price gets rank 4 (best price rank)', () => {
      const indicators: StoreIndicators[] = [
        makeStore('A', 0.5, 0.5, 80),   // lowest price → rank 4
        makeStore('B', 0.5, 0.5, 100),
        makeStore('C', 0.5, 0.5, 120),
        makeStore('D', 0.5, 0.5, 140),  // highest price → rank 1
      ];
      const results = service.computeDemand(indicators);
      const storeA = results.find((r) => r.storeId === 'A')!;
      const storeD = results.find((r) => r.storeId === 'D')!;
      expect(storeA.priceRank).toBe(4);
      expect(storeD.priceRank).toBe(1);
    });
  });
});

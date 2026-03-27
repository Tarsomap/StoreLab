import { CsatService } from '../csat.service';

describe('CsatService', () => {
  let service: CsatService;

  beforeEach(() => {
    service = new CsatService();
  });

  it('calculates standard CSAT with 5 operators and 90% score', () => {
    // (5/10) * 0.9 = 0.45
    expect(service.calculate(5, 0.9)).toBeCloseTo(0.45);
  });

  it('calculates CSAT with 10 operators (ideal) and 100% score', () => {
    // (10/10) * 1.0 = 1.0
    expect(service.calculate(10, 1.0)).toBeCloseTo(1.0);
  });

  it('returns 0 when cashierOperators is 0', () => {
    // (0/10) * 0.9 = 0
    expect(service.calculate(0, 0.9)).toBe(0);
  });

  it('returns 0 when quizScorePercentage is 0', () => {
    // (5/10) * 0 = 0
    expect(service.calculate(5, 0.0)).toBe(0);
  });

  it('returns 0 when both inputs are 0', () => {
    expect(service.calculate(0, 0)).toBe(0);
  });

  it('clamps result to 1 when operators exceeds ideal', () => {
    // (20/10) * 1.0 = 2.0 → clamped to 1.0
    expect(service.calculate(20, 1.0)).toBe(1.0);
  });

  it('clamps result to 1 when score exceeds 1.0 (hypothetical)', () => {
    // (10/10) * 1.5 = 1.5 → clamped to 1.0
    expect(service.calculate(10, 1.5)).toBe(1.0);
  });

  it('handles fractional operators', () => {
    // (3/10) * 0.8 = 0.24
    expect(service.calculate(3, 0.8)).toBeCloseTo(0.24);
  });

  it('calculates correctly with minimal score', () => {
    // (10/10) * 0.1 = 0.1
    expect(service.calculate(10, 0.1)).toBeCloseTo(0.1);
  });

  it('calculates correctly with 1 operator and 50% score', () => {
    // (1/10) * 0.5 = 0.05
    expect(service.calculate(1, 0.5)).toBeCloseTo(0.05);
  });

  it('result is always between 0 and 1', () => {
    const result = service.calculate(7, 0.75);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

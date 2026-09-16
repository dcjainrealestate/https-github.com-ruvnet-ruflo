import { computePricePerSqFt, computeTargetSaleDate } from '../src/services/inventoryCalculations';

describe('computePricePerSqFt', () => {
  it('divides asking price by area', () => {
    expect(computePricePerSqFt(2000000, 1600)).toBe(1250);
  });

  it('returns undefined when there is no asking price (e.g. a lessor listing)', () => {
    expect(computePricePerSqFt(undefined, 1600)).toBeUndefined();
  });

  it('returns undefined for non-positive area', () => {
    expect(computePricePerSqFt(2000000, 0)).toBeUndefined();
  });
});

describe('computeTargetSaleDate', () => {
  it('adds the timeframe in days to the given date', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    expect(computeTargetSaleDate(90, from).toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });
});

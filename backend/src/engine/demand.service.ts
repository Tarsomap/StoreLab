import { Injectable } from '@nestjs/common';
import { CategoryEngineInput, DemandResult, StoreIndicators } from './interfaces';

@Injectable()
export class DemandService {
  computeAvailability(categories: CategoryEngineInput[]): number {
    const totalPurchased = categories.reduce((sum, c) => sum + c.stockPurchased, 0);
    const totalAvailable = categories.reduce((sum, c) => sum + c.sessionStockAvailable, 0);
    if (totalAvailable === 0) return 0;
    return totalPurchased / totalAvailable;
  }

  computeBasketPrice(categories: CategoryEngineInput[]): number {
    const totalPurchased = categories.reduce((sum, c) => sum + c.stockPurchased, 0);
    if (totalPurchased === 0) return 0;
    const weightedSum = categories.reduce(
      (sum, c) => sum + c.stockPurchased * c.unitCost * (1 + c.priceMargin),
      0,
    );
    return weightedSum / totalPurchased;
  }

  computeDemand(indicators: StoreIndicators[]): DemandResult[] {
    if (indicators.length === 0) return [];

    const priceRanks = this.rankIndicator(indicators, 'basketPrice', true);
    const availabilityRanks = this.rankIndicator(indicators, 'availability', false);
    const csatRanks = this.rankIndicator(indicators, 'csat', false);

    const results: DemandResult[] = indicators.map((store) => {
      const priceRank = priceRanks.get(store.storeId) ?? 1;
      const availabilityRank = availabilityRanks.get(store.storeId) ?? 1;
      const csatRank = csatRanks.get(store.storeId) ?? 1;
      const rankScore = priceRank + availabilityRank + csatRank;
      return {
        storeId: store.storeId,
        priceRank,
        availabilityRank,
        csatRank,
        rankScore,
        demandShare: 0,
      };
    });

    const totalScore = results.reduce((sum, r) => sum + r.rankScore, 0);
    results.forEach((r) => {
      r.demandShare = totalScore > 0 ? r.rankScore / totalScore : 0;
    });

    return results;
  }

  /**
   * Rank stores by a given indicator using competitive ranking (same value = same rank).
   * @param lowerIsBetter - if true, lower value gets higher rank (rank 4 = lowest)
   */
  private rankIndicator(
    indicators: StoreIndicators[],
    key: keyof Pick<StoreIndicators, 'basketPrice' | 'availability' | 'csat'>,
    lowerIsBetter: boolean,
  ): Map<string, number> {
    const n = indicators.length;
    const maxRank = n;

    const sorted = [...indicators].sort((a, b) => {
      const diff = a[key] - b[key];
      return lowerIsBetter ? diff : -diff;
    });

    const rankMap = new Map<string, number>();
    let currentRank = maxRank;

    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j < sorted.length && sorted[j][key] === sorted[i][key]) {
        j++;
      }
      const tiedCount = j - i;
      const tiedRank = currentRank - tiedCount + 1;
      for (let k = i; k < j; k++) {
        rankMap.set(sorted[k].storeId, tiedRank);
      }
      currentRank -= tiedCount;
      i = j;
    }

    return rankMap;
  }
}

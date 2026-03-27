import { Injectable } from '@nestjs/common';
import {
  CategoryEngineInput,
  CategoryRevenueResult,
  CapexEngineInput,
  EbitdaInput,
  EbitdaBreakdown,
} from './interfaces';
import {
  BASE_LICENSE_COST,
  CASHIER_SALARY,
  SERVICE_SALARY,
  MAINTENANCE_COST,
  INTEREST_RATE_MONTHLY,
} from './constants';

@Injectable()
export class FinancialService {
  computeCategoryRevenues(
    categories: CategoryEngineInput[],
    demandShare: number,
  ): CategoryRevenueResult[] {
    return categories.map((cat) => {
      const maxSellable = cat.sessionStockAvailable * demandShare;
      const stockSold = Math.min(cat.stockPurchased, maxSellable);
      const unsoldStock = cat.stockPurchased - stockSold;
      const salePrice = cat.unitCost * (1 + cat.priceMargin);
      const grossRevenue = stockSold * salePrice;
      const taxAmount = grossRevenue * cat.taxRate;
      const costOfGoods = stockSold * cat.unitCost;
      return {
        categoryId: cat.categoryId,
        stockSold,
        unsoldStock,
        grossRevenue,
        taxAmount,
        costOfGoods,
      };
    });
  }

  computeEbitda(input: EbitdaInput): EbitdaBreakdown {
    const { categoryRevenues, cashierOperators, serviceOperators, capexDecisions, cashUsed, interestThreshold, slaRevenueLost, shrinkage } = input;

    const grossRevenue = categoryRevenues.reduce((sum, c) => sum + c.grossRevenue, 0);
    const taxAmount = categoryRevenues.reduce((sum, c) => sum + c.taxAmount, 0);
    const netRevenue = grossRevenue - taxAmount;
    const costOfGoods = categoryRevenues.reduce((sum, c) => sum + c.costOfGoods, 0);

    const breakageAmount = shrinkage.totalBreakage;
    const agingAmount = shrinkage.totalAging;

    const payrollCost = cashierOperators * CASHIER_SALARY + serviceOperators * SERVICE_SALARY;

    const hasFreezer = capexDecisions.some(
      (c) => c.type === 'FREEZER' && c.implemented,
    );
    const maintenanceCost = hasFreezer ? 0 : MAINTENANCE_COST;

    const licenseCost =
      BASE_LICENSE_COST +
      capexDecisions
        .filter((c) => c.implemented)
        .reduce((sum, c) => sum + c.monthlyLicenseDelta, 0);

    const interestCost = Math.max(0, cashUsed - interestThreshold) * INTEREST_RATE_MONTHLY;

    const ebitda =
      netRevenue -
      costOfGoods -
      breakageAmount -
      agingAmount -
      payrollCost -
      maintenanceCost -
      licenseCost -
      interestCost -
      slaRevenueLost;

    const ebitdaPercentage = grossRevenue > 0 ? ebitda / grossRevenue : 0;

    return {
      categoryRevenues,
      grossRevenue,
      taxAmount,
      netRevenue,
      costOfGoods,
      breakageAmount,
      agingAmount,
      payrollCost,
      maintenanceCost,
      licenseCost,
      interestCost,
      slaRevenueLost,
      ebitda,
      ebitdaPercentage,
    };
  }
}

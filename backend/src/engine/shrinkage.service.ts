import { Injectable } from '@nestjs/common';
import {
  ShrinkageCategoryInput,
  ShrinkageCategoryResult,
  ShrinkageResult,
} from './interfaces';

@Injectable()
export class ShrinkageService {
  compute(inputs: ShrinkageCategoryInput[]): ShrinkageResult {
    const categories: ShrinkageCategoryResult[] = inputs.map((input) => {
      const unsold = Math.max(0, input.totalUnsold);
      const breakageAmount = unsold * input.unitCost * input.breakageRate;
      const agingAmount = unsold * input.unitCost * input.agingRate;
      return {
        categoryId: input.categoryId,
        breakageAmount,
        agingAmount,
      };
    });

    const totalBreakage = categories.reduce((sum, c) => sum + c.breakageAmount, 0);
    const totalAging = categories.reduce((sum, c) => sum + c.agingAmount, 0);

    return { categories, totalBreakage, totalAging };
  }

  empty(): ShrinkageResult {
    return {
      categories: [],
      totalBreakage: 0,
      totalAging: 0,
    };
  }
}

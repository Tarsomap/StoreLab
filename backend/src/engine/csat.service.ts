import { Injectable } from '@nestjs/common';
import { IDEAL_CASHIER_OPERATORS } from './constants';

@Injectable()
export class CsatService {
  calculate(cashierOperators: number, quizScorePercentage: number): number {
    const raw = (cashierOperators / IDEAL_CASHIER_OPERATORS) * quizScorePercentage;
    return Math.min(1, Math.max(0, raw));
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { RankingEntry, RoundResultEntry, StoreResultEntry } from './interfaces/results.interface';

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSessionResults(sessionId: string): Promise<StoreResultEntry[]> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const results = await this.prisma.roundResult.findMany({
      where: { sessionId },
      include: { store: { select: { name: true } } },
      orderBy: [{ storeId: 'asc' }, { round: 'asc' }],
    });

    const storeMap = new Map<string, StoreResultEntry>();
    for (const r of results) {
      if (!storeMap.has(r.storeId)) {
        storeMap.set(r.storeId, { storeId: r.storeId, storeName: r.store.name, rounds: [] });
      }
      storeMap.get(r.storeId)!.rounds.push(this.toRoundEntry(r));
    }

    return [...storeMap.values()];
  }

  async getSessionRanking(sessionId: string): Promise<RankingEntry[]> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const results = await this.prisma.roundResult.findMany({
      where: { sessionId },
      include: { store: { select: { name: true } } },
      orderBy: { round: 'asc' },
    });

    const storeMap = new Map<
      string,
      {
        storeName: string;
        rounds: { round: number; ebitda: number; ebitdaPercentage: number }[];
        totalEbitda: number;
        sumEbitdaPct: number;
      }
    >();

    for (const r of results) {
      if (!storeMap.has(r.storeId)) {
        storeMap.set(r.storeId, {
          storeName: r.store.name,
          rounds: [],
          totalEbitda: 0,
          sumEbitdaPct: 0,
        });
      }
      const entry = storeMap.get(r.storeId)!;
      entry.rounds.push({ round: r.round, ebitda: r.ebitda, ebitdaPercentage: r.ebitdaPercentage });
      entry.totalEbitda += r.ebitda;
      entry.sumEbitdaPct += r.ebitdaPercentage;
    }

    const unsorted = [...storeMap.entries()].map(([storeId, data]) => ({
      storeId,
      storeName: data.storeName,
      avgEbitdaPercentage: data.rounds.length > 0 ? data.sumEbitdaPct / data.rounds.length : 0,
      totalEbitda: data.totalEbitda,
      rounds: data.rounds,
    }));

    unsorted.sort((a, b) => b.avgEbitdaPercentage - a.avgEbitdaPercentage);

    let rank = 1;
    return unsorted.map((entry, index) => {
      if (index > 0 && entry.avgEbitdaPercentage < unsorted[index - 1].avgEbitdaPercentage) {
        rank = index + 1;
      }
      return { rank, ...entry };
    });
  }

  private toRoundEntry(r: {
    round: number;
    csat: number;
    availability: number;
    basketPrice: number;
    rankScore: number;
    demandShare: number;
    grossRevenue: number;
    taxAmount: number;
    netRevenue: number;
    costOfGoods: number;
    breakageAmount: number;
    agingAmount: number;
    payrollCost: number;
    maintenanceCost: number;
    licenseCost: number;
    interestCost: number;
    slaRevenueLost: number;
    ebitda: number;
    ebitdaPercentage: number;
    cashUsed: number;
  }): RoundResultEntry {
    return {
      round: r.round,
      csat: r.csat,
      availability: r.availability,
      basketPrice: r.basketPrice,
      rankScore: r.rankScore,
      demandShare: r.demandShare,
      grossRevenue: r.grossRevenue,
      taxAmount: r.taxAmount,
      netRevenue: r.netRevenue,
      costOfGoods: r.costOfGoods,
      breakageAmount: r.breakageAmount,
      agingAmount: r.agingAmount,
      payrollCost: r.payrollCost,
      maintenanceCost: r.maintenanceCost,
      licenseCost: r.licenseCost,
      interestCost: r.interestCost,
      slaRevenueLost: r.slaRevenueLost,
      ebitda: r.ebitda,
      ebitdaPercentage: r.ebitdaPercentage,
      cashUsed: r.cashUsed,
    };
  }
}

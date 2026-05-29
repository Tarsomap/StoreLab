import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import {
  RankingEntry,
  RoundResultEntry,
  StoreResultEntry,
} from "./interfaces/results.interface";

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSessionResults(sessionId: string): Promise<StoreResultEntry[]> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, initialCash: true },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const results = await this.prisma.roundResult.findMany({
      where: { sessionId },
      include: { store: { select: { name: true } } },
      orderBy: [{ storeId: "asc" }, { round: "asc" }],
    });

    const quizAnswers = await this.prisma.quizAnswer.findMany({
      where: { store: { sessionId } },
      select: { storeId: true, round: true, scorePercentage: true },
    });
    const quizScoreMap = new Map(
      quizAnswers.map((qa) => [
        `${qa.storeId}:${qa.round}`,
        qa.scorePercentage,
      ]),
    );

    const storeMap = new Map<string, StoreResultEntry>();
    for (const r of results) {
      if (!storeMap.has(r.storeId)) {
        storeMap.set(r.storeId, {
          storeId: r.storeId,
          storeName: r.store.name,
          initialCash: session.initialCash,
          rounds: [],
        });
      }
      const quizScorePercentage =
        quizScoreMap.get(`${r.storeId}:${r.round}`) ?? 0;
      storeMap
        .get(r.storeId)!
        .rounds.push(
          this.toRoundEntry(r, session.initialCash, quizScorePercentage),
        );
    }

    return [...storeMap.values()];
  }

  async getSessionRanking(sessionId: string): Promise<RankingEntry[]> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, initialCash: true },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const results = await this.prisma.roundResult.findMany({
      where: { sessionId },
      include: { store: { select: { name: true } } },
      orderBy: { round: "asc" },
    });

    const storeMap = new Map<
      string,
      {
        storeName: string;
        rounds: {
          round: number;
          ebitda: number;
          ebitdaPercentage: number;
          cashFinal: number;
        }[];
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
      const cashFinal = session.initialCash - r.cashUsed + r.ebitda;
      entry.rounds.push({
        round: r.round,
        ebitda: r.ebitda,
        ebitdaPercentage: r.ebitdaPercentage,
        cashFinal,
      });
      entry.totalEbitda += r.ebitda;
      entry.sumEbitdaPct += r.ebitdaPercentage;
    }

    const unsorted = [...storeMap.entries()].map(([storeId, data]) => ({
      storeId,
      storeName: data.storeName,
      avgEbitdaPercentage:
        data.rounds.length > 0 ? data.sumEbitdaPct / data.rounds.length : 0,
      totalEbitda: data.totalEbitda,
      rounds: data.rounds,
    }));

    unsorted.sort((a, b) => b.totalEbitda - a.totalEbitda);

    let rank = 1;
    return unsorted.map((entry, index) => {
      if (
        index > 0 &&
        entry.totalEbitda < unsorted[index - 1].totalEbitda
      ) {
        rank = index + 1;
      }
      return { rank, ...entry };
    });
  }

  async getStoreRoundResult(
    storeId: string,
    round: number,
  ): Promise<RoundResultEntry> {
    const session = await this.prisma.session.findFirst({
      where: { stores: { some: { id: storeId } } },
      select: { initialCash: true },
    });

    const r = await this.prisma.roundResult.findUnique({
      where: { storeId_round: { storeId, round } },
    });

    if (!r) throw new NotFoundException(`Round ${round} not found for store ${storeId}`);

    const quizAnswer = await this.prisma.quizAnswer.findFirst({
      where: { storeId, round },
      select: { scorePercentage: true },
    });

    const initialCash = session?.initialCash ?? 0;
    const quizScorePercentage = quizAnswer?.scorePercentage ?? 0;

    return this.toRoundEntry(r, initialCash, quizScorePercentage);
  }

  private toRoundEntry(
    r: {
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
    },
    initialCash: number,
    quizScorePercentage: number,
  ): RoundResultEntry {
    // cashFinal = initialCash - cashUsed + grossRevenue - totalCosts
    //           = initialCash - cashUsed + ebitda  (since ebitda = grossRevenue - totalCosts)
    const cashFinal = initialCash - r.cashUsed + r.ebitda;
    const finalScore = quizScorePercentage * r.csat;

    return {
      round: r.round,
      quizScorePercentage,
      csat: r.csat,
      finalScore, //

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
      cashFinal,
    };
  }
}
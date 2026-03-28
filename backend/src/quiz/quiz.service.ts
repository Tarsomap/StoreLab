import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { GameGateway } from '../gateway/game.gateway';
import { CreateQuestionsDto } from './dto/create-questions.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import {
  PlayerQuizResponse,
  PlayerScoreResponse,
  QuizQuestionPublic,
  QuizQuestionWithAnswer,
  StoreScoreResponse,
  SubmitAnswersResponse,
} from './interfaces/quiz.interface';

const IDEAL_OPERATORS = 10;

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameGateway: GameGateway,
  ) {}

  // ─── Facilitador: criar perguntas ───────────────────────────────────────────

  async createQuestions(
    sessionId: string,
    dto: CreateQuestionsDto,
  ): Promise<{ questionsCreated: number }> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    // Remove previous questions for this round (idempotent upsert behaviour)
    const existingIds = await this.prisma.quizQuestion.findMany({
      where: { sessionId, round: dto.round },
      select: { id: true },
    });
    if (existingIds.length > 0) {
      const ids = existingIds.map((q) => q.id);
      await this.prisma.quizOption.deleteMany({ where: { questionId: { in: ids } } });
      await this.prisma.quizQuestion.deleteMany({ where: { id: { in: ids } } });
    }

    await this.prisma.$transaction(
      dto.questions.map((q) =>
        this.prisma.quizQuestion.create({
          data: {
            sessionId,
            round: dto.round,
            prompt: q.prompt,
            order: q.order,
            options: { create: q.options.map((o) => ({ label: o.label, isCorrect: o.isCorrect })) },
          },
        }),
      ),
    );

    return { questionsCreated: dto.questions.length };
  }

  // ─── Facilitador: listar perguntas com gabarito ──────────────────────────────

  async getQuestionsForFacilitator(
    sessionId: string,
    round: number,
  ): Promise<QuizQuestionWithAnswer[]> {
    const questions = await this.loadQuestions(sessionId, round);
    return questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      order: q.order,
      options: q.options.map((o) => ({ id: o.id, label: o.label, isCorrect: o.isCorrect })),
    }));
  }

  // ─── Jogador: buscar quiz SEM gabarito ───────────────────────────────────────
  // Retorna questions:[] quando o facilitador ainda não configurou (sem erro 404)

  async getQuestionsForPlayer(
    sessionId: string,
    storeId: string,
    round: number,
    userId: string,
  ): Promise<PlayerQuizResponse> {
    await this.assertStoreMember(storeId, userId);

    const questions = await this.prisma.quizQuestion.findMany({
      where: { sessionId, round },
      include: { options: true },
      orderBy: { order: 'asc' },
    });

    const alreadyAnswered =
      questions.length > 0 ? await this.hasUserAnswered(userId, storeId, round) : false;

    const publicQuestions: QuizQuestionPublic[] = questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      order: q.order,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    }));

    return { round, alreadyAnswered, questions: publicQuestions };
  }

  // ─── Jogador: score individual da rodada ──────────────────────────────────────

  async getPlayerScore(
    storeId: string,
    userId: string,
    round: number,
  ): Promise<PlayerScoreResponse> {
    const answers = await this.prisma.userQuizAnswer.findMany({
      where: { userId, storeId, round },
    });

    if (answers.length === 0) {
      return { answered: false, correctAnswers: 0, totalQuestions: 0, scorePercentage: 0 };
    }

    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const totalQuestions = answers.length;
    return {
      answered: true,
      correctAnswers,
      totalQuestions,
      scorePercentage: (correctAnswers / totalQuestions) * 100,
    };
  }

  // ─── Jogador: submeter respostas ─────────────────────────────────────────────

  async submitAnswers(
    storeId: string,
    userId: string,
    dto: SubmitAnswersDto,
  ): Promise<SubmitAnswersResponse> {
    const member = await this.prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId, userId } },
      include: { store: { select: { sessionId: true } } },
    });
    if (!member) throw new ForbiddenException('Você não é membro desta loja');

    const sessionId = member.store.sessionId;

    // One attempt per round
    const alreadyAnswered = await this.hasUserAnswered(userId, storeId, dto.round);
    if (alreadyAnswered) {
      throw new ConflictException('Você já respondeu o quiz desta rodada');
    }

    // Load questions to validate count and resolve correctness
    const questions = await this.loadQuestions(sessionId, dto.round);
    if (dto.answers.length !== questions.length) {
      throw new BadRequestException(
        `Esperado ${questions.length} respostas, recebido ${dto.answers.length}`,
      );
    }

    // Build option→isCorrect lookup
    const optionCorrectMap = new Map<string, boolean>();
    for (const q of questions) {
      for (const o of q.options) {
        optionCorrectMap.set(o.id, o.isCorrect);
      }
    }

    // Validate every questionId belongs to this session/round
    const questionIds = new Set(questions.map((q) => q.id));
    for (const ans of dto.answers) {
      if (!questionIds.has(ans.questionId)) {
        throw new BadRequestException(`Pergunta ${ans.questionId} não pertence a esta rodada`);
      }
    }

    let correctCount = 0;
    await this.prisma.$transaction(
      dto.answers.map((ans) => {
        const isCorrect = optionCorrectMap.get(ans.optionId) ?? false;
        if (isCorrect) correctCount++;
        return this.prisma.userQuizAnswer.create({
          data: {
            sessionId,
            storeId,
            userId,
            questionId: ans.questionId,
            optionId: ans.optionId,
            round: dto.round,
            isCorrect,
          },
        });
      }),
    );

    const scorePercentage = (correctCount / questions.length) * 100;

    // Auto-consolidate (updates partial score; finalises when all members answered)
    await this.tryAutoConsolidate(storeId, dto.round);

    // Emit quiz:player-answered with progress count
    const [answeredRows, totalMembers] = await Promise.all([
      this.prisma.userQuizAnswer.findMany({
        where: { storeId, round: dto.round },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.storeMember.count({ where: { storeId } }),
    ]);
    this.gameGateway.emitQuizPlayerAnswered(storeId, {
      userId,
      storeId,
      round: dto.round,
      answered: answeredRows.length,
      total: totalMembers,
    });

    return {
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      scorePercentage,
    };
  }

  // ─── Consolidar score da loja ─────────────────────────────────────────────

  async consolidateStoreScore(
    storeId: string,
    round: number,
  ): Promise<StoreScoreResponse> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { members: { select: { userId: true } }, session: { select: { id: true } } },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');

    const totalMembers = store.members.length;

    const rawAnswers = await this.prisma.userQuizAnswer.findMany({
      where: { storeId, round },
      select: { userId: true, isCorrect: true },
    });

    if (rawAnswers.length === 0) {
      return await this.upsertQuizAnswer(storeId, round, 10, 0, 0, totalMembers);
    }

    const { byUser, totalQuestions } = this.groupAnswersByUser(rawAnswers);
    const membersAnswered = byUser.size;
    const totalCorrect = [...byUser.values()].reduce((sum, v) => sum + v.correct, 0);

    // Average score: (sum of each member's scorePercentage) / membersAnswered
    const scorePercentage =
      (totalCorrect / (membersAnswered * totalQuestions)) * 100;

    return await this.upsertQuizAnswer(
      storeId,
      round,
      totalQuestions,
      totalCorrect,
      scorePercentage,
      totalMembers,
      membersAnswered,
    );
  }

  // ─── Get store score ──────────────────────────────────────────────────────

  async getStoreScore(storeId: string, round: number): Promise<StoreScoreResponse> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { members: { select: { userId: true } } },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');

    const totalMembers = store.members.length;

    const quizAnswer = await this.prisma.quizAnswer.findUnique({
      where: { storeId_round: { storeId, round } },
    });

    const distinctUserIds = await this.prisma.userQuizAnswer.findMany({
      where: { storeId, round },
      select: { userId: true },
      distinct: ['userId'],
    });
    const membersAnswered = distinctUserIds;

    if (!quizAnswer) {
      return {
        storeId,
        round,
        totalQuestions: 0,
        correctAnswers: 0,
        scorePercentage: 0,
        membersAnswered: distinctUserIds.length,
        totalMembers,
      };
    }

    return {
      storeId,
      round,
      totalQuestions: quizAnswer.totalQuestions,
      correctAnswers: quizAnswer.correctAnswers,
      scorePercentage: quizAnswer.scorePercentage,
      membersAnswered: distinctUserIds.length,
      totalMembers,
    };
  }

  // ─── CsatService integration ──────────────────────────────────────────────

  /**
   * Used by the engine to calculate CSAT.
   * CSAT = (cashierOperators / 10) * (quizScorePercentage / 100)
   */
  async calculateCsat(
    storeId: string,
    round: number,
    cashierOperators: number,
  ): Promise<number> {
    const quizAnswer = await this.prisma.quizAnswer.findUnique({
      where: { storeId_round: { storeId, round } },
    });
    const quizScore = quizAnswer?.scorePercentage ?? 0;
    return (cashierOperators / IDEAL_OPERATORS) * (quizScore / 100);
  }

  // ─── hasAllMembersAnswered (used by PlanService confirm guard) ────────────

  async hasAllMembersAnswered(storeId: string, round: number): Promise<boolean> {
    const [totalMembers, answeredMembers] = await Promise.all([
      this.prisma.storeMember.count({ where: { storeId } }),
      this.prisma.userQuizAnswer.findMany({
        where: { storeId, round },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);
    return answeredMembers.length >= totalMembers && totalMembers > 0;
  }

  // ─── Helper used by controller ───────────────────────────────────────────

  async resolveSessionIdByStore(storeId: string): Promise<string> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { sessionId: true },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');
    return store.sessionId;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async loadQuestions(sessionId: string, round: number) {
    const questions = await this.prisma.quizQuestion.findMany({
      where: { sessionId, round },
      include: { options: true },
      orderBy: { order: 'asc' },
    });
    if (questions.length === 0) {
      throw new NotFoundException(`Nenhuma pergunta encontrada para a rodada ${round}`);
    }
    return questions;
  }

  private async hasUserAnswered(
    userId: string,
    storeId: string,
    round: number,
  ): Promise<boolean> {
    const count = await this.prisma.userQuizAnswer.count({
      where: { userId, storeId, round },
    });
    return count > 0;
  }

  private async assertStoreMember(storeId: string, userId: string): Promise<void> {
    const member = await this.prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId, userId } },
    });
    if (!member) throw new ForbiddenException('Você não é membro desta loja');
  }

  private async tryAutoConsolidate(storeId: string, round: number): Promise<void> {
    // Always consolidate so partial scores are also persisted for progress tracking
    await this.consolidateStoreScore(storeId, round);
  }

  private groupAnswersByUser(
    answers: { userId: string; isCorrect: boolean }[],
  ): { byUser: Map<string, { correct: number; total: number }>; totalQuestions: number } {
    const byUser = new Map<string, { correct: number; total: number }>();
    for (const ans of answers) {
      const entry = byUser.get(ans.userId) ?? { correct: 0, total: 0 };
      entry.total++;
      if (ans.isCorrect) entry.correct++;
      byUser.set(ans.userId, entry);
    }
    // totalQuestions = answers per user (all users answered the same questions)
    const totalQuestions = byUser.size > 0 ? [...byUser.values()][0].total : 0;
    return { byUser, totalQuestions };
  }

  private async upsertQuizAnswer(
    storeId: string,
    round: number,
    totalQuestions: number,
    correctAnswers: number,
    scorePercentage: number,
    totalMembers: number,
    membersAnswered = 0,
  ): Promise<StoreScoreResponse> {
    await this.prisma.quizAnswer.upsert({
      where: { storeId_round: { storeId, round } },
      create: { storeId, round, totalQuestions, correctAnswers, scorePercentage },
      update: { totalQuestions, correctAnswers, scorePercentage },
    });

    return { storeId, round, totalQuestions, correctAnswers, scorePercentage, membersAnswered, totalMembers };
  }
}

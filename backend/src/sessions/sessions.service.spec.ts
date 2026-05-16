import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { SessionStatus } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { GameGateway } from "../gateway/game.gateway";
import { ResultsService } from "../results/results.service";
import { SessionsService } from "./sessions.service";

type SessionMock = {
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

type StoreMemberMock = {
  findFirst: jest.Mock;
  deleteMany: jest.Mock;
};

type PlayerRoundStatusMock = {
  upsert: jest.Mock;
  deleteMany: jest.Mock;
};

type SessionCategoryConfigMock = {
  deleteMany: jest.Mock;
  createMany: jest.Mock;
};

type DeleteManyMock = {
  deleteMany: jest.Mock;
};

type OperationalPlanMock = {
  findMany: jest.Mock;
  deleteMany: jest.Mock;
};

type PrismaMock = {
  session: SessionMock;
  storeMember: StoreMemberMock;
  playerRoundStatus: PlayerRoundStatusMock;
  sessionCategoryConfig: SessionCategoryConfigMock;
  operationalPlan: OperationalPlanMock;
  poCategoryDecision: DeleteManyMock;
  poCapexDecision: DeleteManyMock;
  userQuizAnswer: DeleteManyMock;
  quizOption: DeleteManyMock;
  quizAnswer: DeleteManyMock;
  roundResult: DeleteManyMock;
  slaEvent: DeleteManyMock;
  playerTransfer: DeleteManyMock;
  quizQuestion: DeleteManyMock;
  store: DeleteManyMock;
  $transaction: jest.Mock;
};

type GameGatewayMock = {
  emitTimerUpdate: jest.Mock;
  emitRoundStarted: jest.Mock;
  emitSessionFinished: jest.Mock;
};

const baseSession = {
  id: "session-1",
  name: "Sessao",
  status: SessionStatus.ROUND_1,
  facilitatorId: "facilitator-1",
  totalDemand: 1000,
  initialCash: 700000,
  disponibilidade: [],
  timerEnabled: true,
  timerDuration: 600,
  timerStartedAt: null,
  timerPausedAt: null,
  elapsedBeforePause: 0,
  createdAt: new Date("2026-05-15T12:00:00.000Z"),
  updatedAt: new Date("2026-05-15T12:00:00.000Z"),
};

describe("SessionsService timer", () => {
  let prisma: PrismaMock;
  let gateway: GameGatewayMock;
  let service: SessionsService;

  beforeEach(() => {
    prisma = {
      session: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      storeMember: {
        findFirst: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      playerRoundStatus: {
        upsert: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      sessionCategoryConfig: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn(),
      },
      operationalPlan: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      poCategoryDecision: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      poCapexDecision:    { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      userQuizAnswer:     { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      quizOption:         { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      quizAnswer:         { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      roundResult:        { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      slaEvent:           { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      playerTransfer:     { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      quizQuestion:       { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      store:              { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn((callback: (tx: PrismaMock) => unknown) =>
        callback(prisma),
      ),
    };

    gateway = {
      emitTimerUpdate: jest.fn(),
      emitRoundStarted: jest.fn(),
      emitSessionFinished: jest.fn(),
    };

    service = new SessionsService(
      prisma as unknown as PrismaService,
      gateway as unknown as GameGateway,
      {} as unknown as ResultsService,
    );
  });

  it("requires duration when creating a session with timer enabled", async () => {
    await expect(
      service.create(
        {
          name: "Sessao",
          totalDemand: 1000,
          timerEnabled: true,
        },
        "facilitator-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it("updates timer settings after setup without blocking other fields", async () => {
    prisma.session.findUnique.mockResolvedValue({
      ...baseSession,
      status: SessionStatus.ROUND_1,
      timerEnabled: false,
      timerDuration: null,
    });
    prisma.session.update.mockResolvedValue({
      ...baseSession,
      timerEnabled: true,
      timerDuration: 900,
    });

    const result = await service.update(
      "session-1",
      { timerEnabled: true, timerDuration: 900 },
      "facilitator-1",
    );

    expect(result.timerEnabled).toBe(true);
    expect(result.timerDuration).toBe(900);
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: {
        timerEnabled: true,
        timerDuration: 900,
      },
    });
  });

  it("blocks timer start when the timer is not configured", async () => {
    prisma.session.findUnique.mockResolvedValue({
      ...baseSession,
      timerEnabled: false,
      timerDuration: null,
    });

    await expect(
      service.startTimer("session-1", "facilitator-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("blocks timer start outside active rounds", async () => {
    prisma.session.findUnique.mockResolvedValue({
      ...baseSession,
      status: SessionStatus.ROUND_1_CONFIG,
    });

    await expect(
      service.startTimer("session-1", "facilitator-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("calculates remaining time on player finish in the backend", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-15T12:02:00.000Z"));
    prisma.session.findUnique.mockResolvedValue({
      ...baseSession,
      timerStartedAt: new Date("2026-05-15T12:00:00.000Z"),
      elapsedBeforePause: 30,
    });
    prisma.storeMember.findFirst.mockResolvedValue({ id: "member-1" });
    prisma.playerRoundStatus.upsert.mockImplementation((args) =>
      Promise.resolve({
        id: "status-1",
        ...args.create,
      }),
    );

    const result = await service.setPlayerFinished("session-1", "player-1");

    expect(result.remainingTime).toBe(450);
    expect(prisma.playerRoundStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          round: 1,
          status: "FINISHED",
          remainingTime: 450,
        }),
      }),
    );
    jest.useRealTimers();
  });

  it("rejects finish when the player is not in the session", async () => {
    prisma.session.findUnique.mockResolvedValue(baseSession);
    prisma.storeMember.findFirst.mockResolvedValue(null);

    await expect(
      service.setPlayerFinished("session-1", "player-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("resets timer fields atomically when advancing from an active round", async () => {
    prisma.session.findUnique.mockResolvedValue({
      ...baseSession,
      status: SessionStatus.ROUND_1,
      timerStartedAt: new Date("2026-05-15T11:55:00.000Z"),
      elapsedBeforePause: 180,
    });
    prisma.session.update.mockResolvedValue({
      ...baseSession,
      status: SessionStatus.RECONFIGURATION,
      timerStartedAt: null,
      timerPausedAt: null,
      elapsedBeforePause: 0,
    });

    await service.advanceStatus("session-1", "facilitator-1");

    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: {
        status: SessionStatus.RECONFIGURATION,
        timerStartedAt: null,
        timerPausedAt: null,
        elapsedBeforePause: 0,
      },
    });
  });

  it("deletes PlayerRoundStatus before Session in cascade remove", async () => {
    prisma.session.findUnique.mockResolvedValue({
      ...baseSession,
      status: SessionStatus.SETUP,
    });

    await service.remove("session-1", "facilitator-1");

    const prsOrder =
      prisma.playerRoundStatus.deleteMany.mock.invocationCallOrder[0];
    const sessionDeleteOrder =
      prisma.session.delete.mock.invocationCallOrder[0];

    expect(prisma.playerRoundStatus.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: "session-1" },
    });
    expect(prsOrder).toBeLessThan(sessionDeleteOrder);
  });

  it("emits timer update on start with action STARTED", async () => {
    const startedAt = new Date("2026-05-16T10:00:00.000Z");
    prisma.session.findUnique.mockResolvedValue({ ...baseSession });
    prisma.session.update.mockResolvedValue({
      ...baseSession,
      timerStartedAt: startedAt,
      timerPausedAt: null,
    });

    await service.startTimer("session-1", "facilitator-1");

    expect(gateway.emitTimerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ action: "STARTED", sessionId: "session-1" }),
    );
  });

  it("emits timer update on pause with action PAUSED", async () => {
    const startedAt = new Date("2026-05-16T10:00:00.000Z");
    const pausedAt = new Date("2026-05-16T10:05:00.000Z");
    prisma.session.findUnique.mockResolvedValue({
      ...baseSession,
      timerStartedAt: startedAt,
      timerPausedAt: null,
    });
    prisma.session.update.mockResolvedValue({
      ...baseSession,
      timerStartedAt: startedAt,
      timerPausedAt: pausedAt,
      elapsedBeforePause: 300,
    });

    await service.pauseTimer("session-1", "facilitator-1");

    expect(gateway.emitTimerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PAUSED", sessionId: "session-1" }),
    );
  });

  it("emits timer update on stop with action STOPPED", async () => {
    prisma.session.findUnique.mockResolvedValue({ ...baseSession });
    prisma.session.update.mockResolvedValue({
      ...baseSession,
      timerStartedAt: null,
      timerPausedAt: null,
      elapsedBeforePause: 0,
    });

    await service.stopTimer("session-1", "facilitator-1");

    expect(gateway.emitTimerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ action: "STOPPED", sessionId: "session-1" }),
    );
  });
});

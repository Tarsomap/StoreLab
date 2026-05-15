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
};

type StoreMemberMock = {
  findFirst: jest.Mock;
};

type PlayerRoundStatusMock = {
  upsert: jest.Mock;
};

type SessionCategoryConfigMock = {
  deleteMany: jest.Mock;
  createMany: jest.Mock;
};

type PrismaMock = {
  session: SessionMock;
  storeMember: StoreMemberMock;
  playerRoundStatus: PlayerRoundStatusMock;
  sessionCategoryConfig: SessionCategoryConfigMock;
  $transaction: jest.Mock;
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
  let service: SessionsService;

  beforeEach(() => {
    prisma = {
      session: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      storeMember: {
        findFirst: jest.fn(),
      },
      playerRoundStatus: {
        upsert: jest.fn(),
      },
      sessionCategoryConfig: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: PrismaMock) => unknown) =>
        callback(prisma),
      ),
    };

    service = new SessionsService(
      prisma as unknown as PrismaService,
      {} as unknown as GameGateway,
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
});

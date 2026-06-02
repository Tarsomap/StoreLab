import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CapexOption,
  Category,
  OperationalPlan,
  PoCapexDecision,
  PoCategoryDecision,
  Session,
  SessionCapexConfig,
  SessionCategoryConfig,
  Store,
  StoreRole,
} from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { GameGateway } from "../gateway/game.gateway";
import { CategoryDecisionDto } from "./dto/category-decision.dto";
import { CapexDecisionDto } from "./dto/capex-decision.dto";
import { WorkforceDto } from "./dto/workforce.dto";
import {
  CapexDecisionEntry,
  CategoryDecisionEntry,
  PlanFinancials,
  PlanFullResponse,
} from "./interfaces/plan.interface";

// ─── Internal Prisma shape used throughout this service ──────────────────────
type PlanWithRelations = OperationalPlan & {
  store: Store & {
    session: Pick<
      Session,
      | "cashierSalary"
      | "serviceSalary"
      | "baseLicenseCost"
      | "maintenanceCost"
      | "interestRate"
    > & {
      categoryConfigs: SessionCategoryConfig[];
      capexConfigs: SessionCapexConfig[];
    };
  };
  categoryDecisions: (PoCategoryDecision & { category: Category })[];
  capexDecisions: (PoCapexDecision & { capexOption: CapexOption })[];
};

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gameGateway: GameGateway,
  ) {}

  // ─── GET or CREATE plan ─────────────────────────────────────────────────────
  async getOrCreate(
    storeId: string,
    configVersion: number,
    userId: string,
  ): Promise<PlanFullResponse> {
    await this.assertStoreMember(storeId, userId);

    let plan = await this.loadPlan(storeId, configVersion);
    if (!plan) {
      const [categories, capexOptions] = await Promise.all([
        this.prisma.category.findMany({ orderBy: { name: "asc" } }),
        this.prisma.capexOption.findMany({ orderBy: { name: "asc" } }),
      ]);

      plan = await this.prisma.operationalPlan.create({
        data: {
          storeId,
          configVersion,
          cashierOperators: 0,
          serviceOperators: 0,
          categoryDecisions: {
            create: categories.map((cat) => ({
              categoryId: cat.id,
              stockPurchased: 0,
              priceMargin: 0,
            })),
          },
          capexDecisions: {
            create: capexOptions.map((opt) => ({
              capexOptionId: opt.id,
              implemented: false,
            })),
          },
        },
        include: {
          store: {
            include: {
              session: {
                select: {
                  cashierSalary: true,
                  serviceSalary: true,
                  baseLicenseCost: true,
                  maintenanceCost: true,
                  interestRate: true,
                  categoryConfigs: true,
                  capexConfigs: true,
                },
              },
            },
          },
          categoryDecisions: { include: { category: true } },
          capexDecisions: { include: { capexOption: true } },
        },
      });
    }

    const availableCash = await this.resolveAvailableCash(
      storeId,
      configVersion,
    );
    return this.toFullResponse(plan, availableCash);
  }

  // ─── PUT category decision ──────────────────────────────────────────────────
  async updateCategoryDecision(
    planId: string,
    dto: CategoryDecisionDto,
    userId: string,
  ): Promise<PlanFullResponse> {
    const plan = await this.loadPlanById(planId);
    await this.assertStoreMember(plan.storeId, userId);
    this.assertNotConfirmed(plan);

    // Validate session-wide stock: totalAvailable minus what OTHER stores already bought
    const [availableStock, store] = await Promise.all([
      this.resolveStockAvailable(plan.storeId, dto.categoryId),
      this.prisma.store.findUnique({
        where: { id: plan.storeId },
        select: { sessionId: true },
      }),
    ]);
    if (!store) throw new NotFoundException("Loja não encontrada");

    const { _sum } = await this.prisma.poCategoryDecision.aggregate({
      where: {
        categoryId: dto.categoryId,
        plan: {
          configVersion: plan.configVersion,
          storeId: { not: plan.storeId },
          store: { sessionId: store.sessionId },
        },
      },
      _sum: { stockPurchased: true },
    });
    const purchasedByOthers = _sum.stockPurchased ?? 0;
    const remaining = availableStock - purchasedByOthers;

    if (dto.stockPurchased > remaining) {
      throw new BadRequestException(
        `Estoque insuficiente. Disponível: ${remaining} unidades. Já comprado por outras lojas: ${purchasedByOthers}`,
      );
    }

    const existing = plan.categoryDecisions.find(
      (d) => d.categoryId === dto.categoryId,
    );

    if (existing) {
      await this.prisma.poCategoryDecision.update({
        where: { id: existing.id },
        data: {
          stockPurchased: dto.stockPurchased,
          priceMargin: dto.priceMargin,
        },
      });
    } else {
      await this.prisma.poCategoryDecision.create({
        data: {
          planId,
          categoryId: dto.categoryId,
          stockPurchased: dto.stockPurchased,
          priceMargin: dto.priceMargin,
        },
      });
    }

    const response = await this.refreshAndRespond(planId);
    this.gameGateway.emitPlanUpdated(response.storeId, response);
    return response;
  }

  // ─── PUT capex decision ─────────────────────────────────────────────────────
  async updateCapexDecision(
    planId: string,
    dto: CapexDecisionDto,
    userId: string,
  ): Promise<PlanFullResponse> {
    const plan = await this.loadPlanById(planId);
    await this.assertStoreMember(plan.storeId, userId);
    this.assertNotConfirmed(plan);

    // configVersion 2: block re-implementing a CAPEX already implemented in config1
    if (plan.configVersion === 2) {
      const config1Plan = await this.loadPlan(plan.storeId, 1);
      if (config1Plan) {
        const alreadyDone = config1Plan.capexDecisions.find(
          (d) => d.capexOptionId === dto.capexOptionId && d.implemented,
        );
        if (alreadyDone && dto.implemented) {
          throw new BadRequestException(
            "Este CAPEX já foi implementado na 1ª Configuração",
          );
        }
      }
    }

    const existing = plan.capexDecisions.find(
      (d) => d.capexOptionId === dto.capexOptionId,
    );

    if (existing) {
      await this.prisma.poCapexDecision.update({
        where: { id: existing.id },
        data: { implemented: dto.implemented },
      });
    } else {
      await this.prisma.poCapexDecision.create({
        data: {
          planId,
          capexOptionId: dto.capexOptionId,
          implemented: dto.implemented,
        },
      });
    }

    const response = await this.refreshAndRespond(planId);
    this.gameGateway.emitPlanUpdated(response.storeId, response);
    return response;
  }

  // ─── PUT workforce ──────────────────────────────────────────────────────────
  async updateWorkforce(
    planId: string,
    dto: WorkforceDto,
    userId: string,
  ): Promise<PlanFullResponse> {
    const plan = await this.loadPlanById(planId);
    await this.assertStoreMember(plan.storeId, userId);
    this.assertNotConfirmed(plan);

    await this.prisma.operationalPlan.update({
      where: { id: planId },
      data: {
        cashierOperators: dto.cashierOperators,
        serviceOperators: dto.serviceOperators,
      },
    });

    const response = await this.refreshAndRespond(planId);
    this.gameGateway.emitPlanUpdated(response.storeId, response);
    return response;
  }

  // ─── POST confirm ───────────────────────────────────────────────────────────
  async confirmPlan(planId: string, userId: string): Promise<PlanFullResponse> {
    const plan = await this.loadPlanById(planId);

    await this.assertStoreRole(plan.storeId, userId, StoreRole.STORE_MANAGER);
    this.assertNotConfirmed(plan);

    // All members must have submitted quiz answers for the current round
    const round = plan.configVersion; // config 1 → round 1, config 2 → round 2
    const [totalMembers, answeredMembers] = await Promise.all([
      this.prisma.storeMember.count({ where: { storeId: plan.storeId } }),
      this.prisma.userQuizAnswer.groupBy({
        by: ["userId"],
        where: { storeId: plan.storeId, round },
      }),
    ]);
    if (answeredMembers.length < totalMembers) {
      throw new BadRequestException(
        `${answeredMembers.length}/${totalMembers} membros responderam o quiz. Todos devem responder antes de confirmar o PO.`,
      );
    }

    await this.prisma.operationalPlan.update({
      where: { id: planId },
      data: { confirmed: true, confirmedAt: new Date() },
    });

    const response = await this.refreshAndRespond(planId);

    const store = await this.prisma.store.findUnique({
      where: { id: plan.storeId },
      select: { sessionId: true },
    });
    if (store) {
      this.gameGateway.emitStoreConfirmed(store.sessionId, plan.storeId);
    }

    return response;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async loadPlan(
    storeId: string,
    configVersion: number,
  ): Promise<PlanWithRelations | null> {
    return this.prisma.operationalPlan.findUnique({
      where: { storeId_configVersion: { storeId, configVersion } },
      include: {
        store: {
          include: {
            session: {
              select: {
                cashierSalary: true,
                serviceSalary: true,
                baseLicenseCost: true,
                maintenanceCost: true,
                interestRate: true,
                categoryConfigs: true,
                capexConfigs: true,
              },
            },
          },
        },
        categoryDecisions: { include: { category: true } },
        capexDecisions: { include: { capexOption: true } },
      },
    });
  }

  private async loadPlanById(planId: string): Promise<PlanWithRelations> {
    const plan = await this.prisma.operationalPlan.findUnique({
      where: { id: planId },
      include: {
        store: {
          include: {
            session: {
              select: {
                cashierSalary: true,
                serviceSalary: true,
                baseLicenseCost: true,
                maintenanceCost: true,
                interestRate: true,
                categoryConfigs: true,
                capexConfigs: true,
              },
            },
          },
        },
        categoryDecisions: { include: { category: true } },
        capexDecisions: { include: { capexOption: true } },
      },
    });
    if (!plan) throw new NotFoundException("Plano não encontrado");
    return plan;
  }

  private async refreshAndRespond(planId: string): Promise<PlanFullResponse> {
    const plan = await this.loadPlanById(planId);
    const availableCash = await this.resolveAvailableCash(
      plan.storeId,
      plan.configVersion,
    );
    return this.toFullResponse(plan, availableCash);
  }

  /**
   * For configVersion 1: availableCash = session.initialCash
   * For configVersion 2: availableCash = initialCash - cashUsedConfig1 + unimplementedCapexCostConfig1
   */
  private async resolveAvailableCash(
    storeId: string,
    configVersion: number,
  ): Promise<number> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { session: { select: { initialCash: true } } },
    });
    if (!store) throw new NotFoundException("Loja não encontrada");

    const initialCash = store.session.initialCash;
    if (configVersion === 1) return initialCash;

    // config2: derive from config1 spending
    const config1 = await this.loadPlan(storeId, 1);
    if (!config1) return initialCash;

    const categoryConfigMap = new Map(
      config1.store.session.categoryConfigs.map((c) => [c.categoryId, c]),
    );
    const capexConfigMap = new Map(
      config1.store.session.capexConfigs.map((c) => [c.capexOptionId, c]),
    );
    const stockCost1 = config1.categoryDecisions.reduce(
      (sum, d) =>
        sum +
        d.stockPurchased *
          (categoryConfigMap.get(d.categoryId)?.unitCost ??
            d.category.unitCost),
      0,
    );

    const implementedCapexCost1 = config1.capexDecisions
      .filter((d) => d.implemented)
      .reduce(
        (sum, d) =>
          sum +
          (capexConfigMap.get(d.capexOptionId)?.acquisitionCost ??
            d.capexOption.acquisitionCost),
        0,
      );
    const unimplementedCapexCost1 = config1.capexDecisions
      .filter((d) => !d.implemented)
      .reduce(
        (sum, d) =>
          sum +
          (capexConfigMap.get(d.capexOptionId)?.acquisitionCost ??
            d.capexOption.acquisitionCost),
        0,
      );

    const cashUsedConfig1 = stockCost1 + implementedCapexCost1;
    return initialCash - cashUsedConfig1 + unimplementedCapexCost1;
  }

  private async resolveStockAvailable(
    storeId: string,
    categoryId: string,
  ): Promise<number> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { session: { select: { id: true, disponibilidade: true } } },
    });
    if (!store) throw new NotFoundException("Loja não encontrada");

    const sessionId = store.session.id;

    // Check sessionCategoryConfig table first (legacy/explicit config)
    const sessionConfig = await this.prisma.sessionCategoryConfig.findUnique({
      where: { sessionId_categoryId: { sessionId, categoryId } },
    });
    if (sessionConfig) return sessionConfig.stockAvailable;

    // Fall back to the array or category default
    const allCategories = await this.prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    const catIndex = allCategories.findIndex((c) => c.id === categoryId);

    if (
      catIndex !== -1 &&
      store.session.disponibilidade &&
      store.session.disponibilidade[catIndex] !== undefined
    ) {
      return store.session.disponibilidade[catIndex];
    }

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException("Categoria não encontrada");
      return category.stockAvailable;
    }

  private async assertStoreMember(
    storeId: string,
    userId: string,
  ): Promise<void> {
    const member = await this.prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId, userId } },
    });
    if (!member) throw new ForbiddenException("Você não é membro desta loja");
  }

  private async assertStoreRole(
    storeId: string,
    userId: string,
    role: StoreRole,
  ): Promise<void> {
    const member = await this.prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId, userId } },
    });
    if (!member || member.role !== role) {
      throw new ForbiddenException(`Esta ação requer o papel ${role}`);
    }
  }

  private assertNotConfirmed(plan: OperationalPlan): void {
    if (plan.confirmed) {
      throw new BadRequestException(
        "Plano já confirmado — não pode ser alterado",
      );
    }
  }

  // ─── Projection & mapping ───────────────────────────────────────────────────

  private computeFinancials(
    plan: PlanWithRelations,
    availableCash: number,
  ): PlanFinancials {
    // Cash used = stock purchases + implemented CAPEXes
    const categoryConfigMap = new Map(
      plan.store.session.categoryConfigs.map((c) => [c.categoryId, c]),
    );
    const capexConfigMap = new Map(
      plan.store.session.capexConfigs.map((c) => [c.capexOptionId, c]),
    );

    const stockCost = plan.categoryDecisions.reduce(
      (sum, d) =>
        sum +
        d.stockPurchased *
          (categoryConfigMap.get(d.categoryId)?.unitCost ??
            d.category.unitCost),
      0,
    );
    const implementedCapexCost = plan.capexDecisions
      .filter((d) => d.implemented)
      .reduce(
        (sum, d) =>
          sum +
          (capexConfigMap.get(d.capexOptionId)?.acquisitionCost ??
            d.capexOption.acquisitionCost),
        0,
      );
    const cashUsed = stockCost + implementedCapexCost;

    // Interest on excess (above availableCash)
    const {
      cashierSalary,
      serviceSalary,
      baseLicenseCost,
      maintenanceCost: maintenanceCostBase,
      interestRate,
    } = plan.store.session;

    const interestCost = Math.max(0, cashUsed - availableCash) * interestRate;

    // Payroll
    const payrollCost =
      plan.cashierOperators * cashierSalary +
      plan.serviceOperators * serviceSalary;

    // Maintenance: session base minus savings from implemented CAPEXes.
    const maintenanceSaving = plan.capexDecisions
      .filter((d) => d.implemented)
      .reduce(
        (sum, d) =>
          sum +
          (capexConfigMap.get(d.capexOptionId)?.maintenanceSaving ??
            d.capexOption.maintenanceSaving),
        0,
      );
    const maintenanceCost = Math.max(0, maintenanceCostBase - maintenanceSaving);

    // License: base configured in the session + deltas of implemented CAPEXes
    const licenseCost =
      baseLicenseCost +
      plan.capexDecisions
        .filter((d) => d.implemented)
        .reduce(
          (sum, d) =>
            sum +
            (capexConfigMap.get(d.capexOptionId)?.monthlyLicenseDelta ??
              d.capexOption.monthlyLicenseDelta),
          0,
        );

    // Projected revenue — simplified: assume 100% of stock is sold
    let projectedGrossRevenue = 0;
    let projectedTax = 0;
    let projectedCOGS = 0;

    for (const d of plan.categoryDecisions) {
      const categoryConfig = categoryConfigMap.get(d.categoryId);
      const unitCost = categoryConfig?.unitCost ?? d.category.unitCost;
      const taxRate = categoryConfig?.taxRate ?? d.category.taxRate;
      const salePrice = unitCost * (1 + d.priceMargin);
      const revenue = d.stockPurchased * salePrice;
      projectedGrossRevenue += revenue;
      projectedTax += revenue * taxRate;
      projectedCOGS += d.stockPurchased * unitCost;
    }

    const projectedNetRevenue = projectedGrossRevenue - projectedTax;
    const projectedEbitda =
      projectedNetRevenue -
      projectedCOGS -
      payrollCost -
      maintenanceCost -
      licenseCost -
      interestCost;
    const projectedEbitdaPercentage =
      projectedGrossRevenue > 0 ? projectedEbitda / projectedGrossRevenue : 0;

    return {
      cashUsed,
      availableCash,
      interestCost,
      cashierSalary,
      serviceSalary,
      baseLicenseCost,
      maintenanceCostBase,
      interestRate,
      payrollCost,
      maintenanceCost,
      licenseCost,
      projectedGrossRevenue,
      projectedEbitda,
      projectedEbitdaPercentage,
    };
  }

  private toFullResponse(
    plan: PlanWithRelations,
    availableCash: number,
  ): PlanFullResponse {
    const categoryConfigMap = new Map(
      plan.store.session.categoryConfigs.map((c) => [c.categoryId, c]),
    );
    const capexConfigMap = new Map(
      plan.store.session.capexConfigs.map((c) => [c.capexOptionId, c]),
    );

    const categoryDecisions: CategoryDecisionEntry[] =
      plan.categoryDecisions.map((d) => {
        const config = categoryConfigMap.get(d.categoryId);
        const unitCost = config?.unitCost ?? d.category.unitCost;
        return {
          id: d.id,
          categoryId: d.categoryId,
          categoryName: d.category.name,
          unitCost,
          taxRate: config?.taxRate ?? d.category.taxRate,
          breakageRate: config?.breakageRate ?? d.category.breakageRate,
          agingRate: config?.agingRate ?? d.category.agingRate,
          stockPurchased: d.stockPurchased,
          priceMargin: d.priceMargin,
          lineCost: d.stockPurchased * unitCost,
        };
      });

    const capexDecisions: CapexDecisionEntry[] = plan.capexDecisions.map(
      (d) => {
        const config = capexConfigMap.get(d.capexOptionId);
        return {
          id: d.id,
          capexOptionId: d.capexOptionId,
          capexName: d.capexOption.name,
          acquisitionCost:
            config?.acquisitionCost ?? d.capexOption.acquisitionCost,
          implemented: d.implemented,
        };
      },
    );

    return {
      id: plan.id,
      storeId: plan.storeId,
      configVersion: plan.configVersion,
      cashierOperators: plan.cashierOperators,
      serviceOperators: plan.serviceOperators,
      confirmed: plan.confirmed,
      confirmedAt: plan.confirmedAt,
      categoryDecisions,
      capexDecisions,
      financials: this.computeFinancials(plan, availableCash),
    };
  }
}

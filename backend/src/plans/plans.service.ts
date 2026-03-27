import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CapexOption,
  Category,
  OperationalPlan,
  PoCapexDecision,
  PoCategoryDecision,
  StoreRole,
} from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { GameGateway } from '../gateway/game.gateway';
import { CategoryDecisionDto } from './dto/category-decision.dto';
import { CapexDecisionDto } from './dto/capex-decision.dto';
import { WorkforceDto } from './dto/workforce.dto';
import {
  CapexDecisionEntry,
  CategoryDecisionEntry,
  PlanFinancials,
  PlanFullResponse,
} from './interfaces/plan.interface';

// ─── Business constants ───────────────────────────────────────────────────────
const CASHIER_SALARY = 1_000;
const SERVICE_SALARY = 1_200;
const BASE_LICENSE_COST = 500;
const MAINTENANCE_COST = 400;
const INTEREST_RATE = 0.12;

// ─── Internal Prisma shape used throughout this service ──────────────────────
type PlanWithRelations = OperationalPlan & {
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
      plan = await this.prisma.operationalPlan.create({
        data: { storeId, configVersion, cashierOperators: 0, serviceOperators: 0 },
        include: { categoryDecisions: { include: { category: true } }, capexDecisions: { include: { capexOption: true } } },
      });
    }

    const availableCash = await this.resolveAvailableCash(storeId, configVersion);
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

    // Validate stock cap against session config or category default
    const availableStock = await this.resolveStockAvailable(plan.storeId, dto.categoryId);
    if (dto.stockPurchased > availableStock) {
      throw new BadRequestException(
        `Estoque máximo disponível para esta categoria: ${availableStock} unidades`,
      );
    }

    const existing = plan.categoryDecisions.find(
      (d) => d.categoryId === dto.categoryId,
    );

    if (existing) {
      await this.prisma.poCategoryDecision.update({
        where: { id: existing.id },
        data: { stockPurchased: dto.stockPurchased, priceMargin: dto.priceMargin },
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
            'Este CAPEX já foi implementado na 1ª Configuração',
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
        data: { planId, capexOptionId: dto.capexOptionId, implemented: dto.implemented },
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
      data: { cashierOperators: dto.cashierOperators, serviceOperators: dto.serviceOperators },
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
        by: ['userId'],
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
        categoryDecisions: { include: { category: true } },
        capexDecisions: { include: { capexOption: true } },
      },
    });
  }

  private async loadPlanById(planId: string): Promise<PlanWithRelations> {
    const plan = await this.prisma.operationalPlan.findUnique({
      where: { id: planId },
      include: {
        categoryDecisions: { include: { category: true } },
        capexDecisions: { include: { capexOption: true } },
      },
    });
    if (!plan) throw new NotFoundException('Plano não encontrado');
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
    if (!store) throw new NotFoundException('Loja não encontrada');

    const initialCash = store.session.initialCash;
    if (configVersion === 1) return initialCash;

    // config2: derive from config1 spending
    const config1 = await this.loadPlan(storeId, 1);
    if (!config1) return initialCash;

    const stockCost1 = config1.categoryDecisions.reduce(
      (sum, d) => sum + d.stockPurchased * d.category.unitCost,
      0,
    );
    const implementedCapexCost1 = config1.capexDecisions
      .filter((d) => d.implemented)
      .reduce((sum, d) => sum + d.capexOption.acquisitionCost, 0);
    const unimplementedCapexCost1 = config1.capexDecisions
      .filter((d) => !d.implemented)
      .reduce((sum, d) => sum + d.capexOption.acquisitionCost, 0);

    const cashUsedConfig1 = stockCost1 + implementedCapexCost1;
    return initialCash - cashUsedConfig1 + unimplementedCapexCost1;
  }

  private async resolveStockAvailable(
    storeId: string,
    categoryId: string,
  ): Promise<number> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { sessionId: true },
    });
    if (!store) throw new NotFoundException('Loja não encontrada');

    // Check session-level override first
    const sessionConfig = await this.prisma.sessionCategoryConfig.findUnique({
      where: { sessionId_categoryId: { sessionId: store.sessionId, categoryId } },
    });
    if (sessionConfig) return sessionConfig.stockAvailable;

    // Fall back to category default
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return category.stockAvailable;
  }

  private async assertStoreMember(storeId: string, userId: string): Promise<void> {
    const member = await this.prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId, userId } },
    });
    if (!member) throw new ForbiddenException('Você não é membro desta loja');
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
      throw new BadRequestException('Plano já confirmado — não pode ser alterado');
    }
  }

  // ─── Projection & mapping ───────────────────────────────────────────────────

  private computeFinancials(
    plan: PlanWithRelations,
    availableCash: number,
  ): PlanFinancials {
    // Cash used = stock purchases + implemented CAPEXes
    const stockCost = plan.categoryDecisions.reduce(
      (sum, d) => sum + d.stockPurchased * d.category.unitCost,
      0,
    );
    const implementedCapexCost = plan.capexDecisions
      .filter((d) => d.implemented)
      .reduce((sum, d) => sum + d.capexOption.acquisitionCost, 0);
    const cashUsed = stockCost + implementedCapexCost;

    // Interest on excess (above availableCash)
    const interestCost = Math.max(0, cashUsed - availableCash) * INTEREST_RATE;

    // Payroll
    const payrollCost =
      plan.cashierOperators * CASHIER_SALARY +
      plan.serviceOperators * SERVICE_SALARY;

    // Maintenance: R$400 unless FREEZER is implemented
    const freezerImplemented = plan.capexDecisions.some(
      (d) => d.implemented && d.capexOption.type === 'FREEZER',
    );
    const maintenanceCost = freezerImplemented ? 0 : MAINTENANCE_COST;

    // License: base R$500 + deltas of implemented CAPEXes
    const licenseCost =
      BASE_LICENSE_COST +
      plan.capexDecisions
        .filter((d) => d.implemented)
        .reduce((sum, d) => sum + d.capexOption.monthlyLicenseDelta, 0);

    // Projected revenue — simplified: assume 100% of stock is sold
    let projectedGrossRevenue = 0;
    let projectedTax = 0;
    let projectedCOGS = 0;

    for (const d of plan.categoryDecisions) {
      const salePrice = d.category.unitCost * (1 + d.priceMargin);
      const revenue = d.stockPurchased * salePrice;
      projectedGrossRevenue += revenue;
      projectedTax += revenue * d.category.taxRate;
      projectedCOGS += d.stockPurchased * d.category.unitCost;
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
      projectedGrossRevenue > 0
        ? projectedEbitda / projectedGrossRevenue
        : 0;

    return {
      cashUsed,
      availableCash,
      interestCost,
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
    const categoryDecisions: CategoryDecisionEntry[] = plan.categoryDecisions.map(
      (d) => ({
        id: d.id,
        categoryId: d.categoryId,
        categoryName: d.category.name,
        unitCost: d.category.unitCost,
        stockPurchased: d.stockPurchased,
        priceMargin: d.priceMargin,
        lineCost: d.stockPurchased * d.category.unitCost,
      }),
    );

    const capexDecisions: CapexDecisionEntry[] = plan.capexDecisions.map((d) => ({
      id: d.id,
      capexOptionId: d.capexOptionId,
      capexName: d.capexOption.name,
      acquisitionCost: d.capexOption.acquisitionCost,
      implemented: d.implemented,
    }));

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

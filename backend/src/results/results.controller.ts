import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ResultsService } from "./results.service";
import { RankingEntry, StoreResultEntry } from "./interfaces/results.interface";

@Controller("results")
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get(":sessionId")
  async getSessionResults(
    @Param("sessionId") sessionId: string,
  ): Promise<StoreResultEntry[]> {
    return this.resultsService.getSessionResults(sessionId);
  }

  @Get(":sessionId/ranking")
  async getSessionRanking(
    @Param("sessionId") sessionId: string,
  ): Promise<RankingEntry[]> {
    return this.resultsService.getSessionRanking(sessionId);
  }

  @Get("store/:storeId/round/:round")
  async getStoreRoundResult(
    @Param("storeId") storeId: string,
    @Param("round") round: string,
  ) {
    return this.resultsService.getStoreRoundResult(storeId, Number(round));
  }
}

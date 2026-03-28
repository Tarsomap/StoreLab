import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { QuizService } from './quiz.service';
import { CreateQuestionsDto } from './dto/create-questions.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { ConsolidateDto } from './dto/consolidate.dto';

// ─── Facilitador: gerencia perguntas via /sessions/:sessionId/quiz/* ──────────
@Controller('sessions/:sessionId/quiz')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACILITATOR)
export class SessionQuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('questions')
  createQuestions(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateQuestionsDto,
  ) {
    return this.quizService.createQuestions(sessionId, dto);
  }

  @Get('questions')
  getQuestionsForFacilitator(
    @Param('sessionId') sessionId: string,
    @Query('round', ParseIntPipe) round: number,
  ) {
    return this.quizService.getQuestionsForFacilitator(sessionId, round);
  }
}

// ─── Jogador: responde quiz via /stores/:storeId/quiz/* ───────────────────────
@Controller('stores/:storeId/quiz')
@UseGuards(JwtAuthGuard)
export class StoreQuizController {
  constructor(private readonly quizService: QuizService) {}

  /**
   * GET /stores/:storeId/quiz?round=1
   * Retorna perguntas SEM gabarito + flag alreadyAnswered.
   * Necessita de sessionId para buscar as perguntas — buscado a partir da loja.
   */
  @Get()
  async getQuestionsForPlayer(
    @Param('storeId') storeId: string,
    @Query('round', ParseIntPipe) round: number,
    @CurrentUser() user: JwtPayload,
  ) {
    const sessionId = await this.quizService.resolveSessionIdByStore(storeId);
    return this.quizService.getQuestionsForPlayer(sessionId, storeId, round, user.sub);
  }

  @Post('submit')
  submitAnswers(
    @Param('storeId') storeId: string,
    @Body() dto: SubmitAnswersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quizService.submitAnswers(storeId, user.sub, dto);
  }

  @Get('score')
  getStoreScore(
    @Param('storeId') storeId: string,
    @Query('round', ParseIntPipe) round: number,
  ) {
    return this.quizService.getStoreScore(storeId, round);
  }

  @Get('my-score')
  getMyScore(
    @Param('storeId') storeId: string,
    @Query('round', ParseIntPipe) round: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quizService.getPlayerScore(storeId, user.sub, round);
  }
}

// ─── Engine / Interno: consolidar score ──────────────────────────────────────
@Controller('quiz/stores/:storeId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACILITATOR)
export class QuizConsolidateController {
  constructor(private readonly quizService: QuizService) {}

  @Post('consolidate')
  consolidate(
    @Param('storeId') storeId: string,
    @Body() dto: ConsolidateDto,
  ) {
    return this.quizService.consolidateStoreScore(storeId, dto.round);
  }
}

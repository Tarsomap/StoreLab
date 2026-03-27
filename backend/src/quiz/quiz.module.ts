import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  QuizConsolidateController,
  SessionQuizController,
  StoreQuizController,
} from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [AuthModule],
  controllers: [SessionQuizController, StoreQuizController, QuizConsolidateController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}

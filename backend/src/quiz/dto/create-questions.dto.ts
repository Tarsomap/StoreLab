import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

const QUESTIONS_PER_ROUND = 10;
const OPTIONS_PER_QUESTION = 4;

class QuizOptionDto {
  @IsString()
  label: string;

  @IsBoolean()
  isCorrect: boolean;
}

class QuizQuestionDto {
  @IsString()
  prompt: string;

  @IsInt()
  @IsPositive()
  order: number;

  @IsArray()
  @ArrayMinSize(OPTIONS_PER_QUESTION)
  @ArrayMaxSize(OPTIONS_PER_QUESTION)
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options: QuizOptionDto[];
}

export class CreateQuestionsDto {
  @IsInt()
  @IsPositive()
  round: number;

  @IsArray()
  @ArrayMinSize(QUESTIONS_PER_ROUND)
  @ArrayMaxSize(QUESTIONS_PER_ROUND)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];
}

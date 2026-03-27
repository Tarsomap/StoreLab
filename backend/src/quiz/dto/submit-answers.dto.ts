import { Type } from 'class-transformer';
import { IsArray, IsInt, IsPositive, IsUUID, ValidateNested } from 'class-validator';

class AnswerEntryDto {
  @IsUUID()
  questionId: string;

  @IsUUID()
  optionId: string;
}

export class SubmitAnswersDto {
  @IsInt()
  @IsPositive()
  round: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerEntryDto)
  answers: AnswerEntryDto[];
}

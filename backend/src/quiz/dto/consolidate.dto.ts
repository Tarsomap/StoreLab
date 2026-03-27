import { IsInt, IsPositive } from 'class-validator';

export class ConsolidateDto {
  @IsInt()
  @IsPositive()
  round: number;
}

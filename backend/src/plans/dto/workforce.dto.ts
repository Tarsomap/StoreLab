import { IsInt, Max, Min } from 'class-validator';

export class WorkforceDto {
  @IsInt()
  @Min(0)
  @Max(10)
  cashierOperators: number;

  @IsInt()
  @Min(0)
  @Max(5)
  serviceOperators: number;
}

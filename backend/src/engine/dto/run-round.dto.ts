import { IsString, IsInt, Min, Max } from 'class-validator';

export class RunRoundDto {
  @IsString()
  sessionId!: string;

  @IsInt()
  @Min(1)
  @Max(3)
  round!: number;
}

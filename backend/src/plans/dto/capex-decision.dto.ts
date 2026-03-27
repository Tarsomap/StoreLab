import { IsBoolean, IsUUID } from 'class-validator';

export class CapexDecisionDto {
  @IsUUID()
  capexOptionId: string;

  @IsBoolean()
  implemented: boolean;
}

import { IsInt, IsNumber, IsUUID, Max, Min } from 'class-validator';

export class CategoryDecisionDto {
  @IsUUID()
  categoryId: string;

  @IsInt()
  @Min(0)
  stockPurchased: number;

  @IsNumber()
  @Min(0)
  @Max(5) // máx 500% de margem
  priceMargin: number;
}

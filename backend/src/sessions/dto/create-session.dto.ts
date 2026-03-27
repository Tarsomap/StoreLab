import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class CategoryConfigDto {
  @IsUUID()
  categoryId: string;

  @IsInt()
  @IsPositive()
  stockAvailable: number;
}

export class CreateSessionDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  initialCash?: number;

  @IsNumber()
  @IsPositive()
  totalDemand: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryConfigDto)
  @IsOptional()
  categoryConfigs?: CategoryConfigDto[];
}

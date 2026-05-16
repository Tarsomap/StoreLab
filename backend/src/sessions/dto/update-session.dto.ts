import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { CategoryConfigDto } from "./create-session.dto";

export class UpdateSessionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  totalDemand?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  initialCash?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryConfigDto)
  @IsOptional()
  categoryConfigs?: CategoryConfigDto[];

  @IsBoolean()
  @IsOptional()
  timerEnabled?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  timerDuration?: number;
}

import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { CapexConfigDto, CategoryConfigDto } from "./create-session.dto";

/**
 * DTO de atualização — todos os campos são opcionais.
 * Fora de SETUP, apenas `name` é aceito (validado no serviço).
 */
export class UpdateSessionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  initialCash?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  totalDemand?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryConfigDto)
  @IsOptional()
  categoryConfigs?: CategoryConfigDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapexConfigDto)
  @IsOptional()
  capexConfigs?: CapexConfigDto[];

  // ── Custos operacionais (editáveis apenas em SETUP) ──────────────────────

  @IsNumber()
  @IsPositive()
  @IsOptional()
  cashierSalary?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  serviceSalary?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseLicenseCost?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maintenanceCost?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  interestRate?: number;

  // ── Timer ────────────────────────────────────────────────────────────────

  @IsOptional()
  @IsBoolean()
  timerEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  timerDuration?: number;
}

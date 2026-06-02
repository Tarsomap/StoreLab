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

/**
 * Uma linha de configuração financeira/estoque por categoria na sessão.
 */
export class CategoryConfigDto {
  /** Qual categoria do catálogo (UUID). */
  @IsUUID()
  categoryId: string;

  /** Quantidade disponível na sessão para somar compras de todas as lojas (evita estoque infinito no jogo). */
  @IsInt()
  @IsPositive()
  stockAvailable: number;

  /** Custo unitário da categoria nesta sessão. */
  @IsNumber()
  @Min(0)
  unitCost: number;

  /** Imposto sobre venda, em decimal (ex.: 0.12 = 12%). */
  @IsNumber()
  @Min(0)
  taxRate: number;

  /** Taxa de quebra, em decimal. */
  @IsNumber()
  @Min(0)
  breakageRate: number;

  /** Taxa de aging, em decimal. */
  @IsNumber()
  @Min(0)
  agingRate: number;
}

/**
 * Configuração de CAPEX por sessão. Mantém o catálogo global como padrão, mas permite cenário específico.
 */
export class CapexConfigDto {
  /** Qual CAPEX do catálogo (UUID). */
  @IsUUID()
  capexOptionId: string;

  /** Custo de aquisição do CAPEX nesta sessão. */
  @IsNumber()
  @Min(0)
  acquisitionCost: number;

  /** Dias fixos de parada caso o incidente de SLA ocorra. */
  @IsInt()
  @Min(0)
  downtimeFixedDays: number;

  /** Acréscimo mensal na licença de software quando implementado. */
  @IsNumber()
  @Min(0)
  monthlyLicenseDelta: number;

  /** Economia de manutenção prevista pelo CAPEX. */
  @IsNumber()
  @Min(0)
  maintenanceSaving: number;

  /** Risco de incidente SLA, em decimal (ex.: 0.15 = 15%). */
  @IsNumber()
  @Min(0)
  slaRiskPercent: number;
}

/**
 * Dados para criar uma nova sessão: nome, demanda total, caixa inicial opcional e ajustes de estoque por categoria.
 * Tudo é validado antes de chegar ao serviço — assim o facilitador não grava números inválidos que quebrariam o motor depois.
 */
export class CreateSessionDto {
  /** Nome da partida (ex.: “Turma manhã”). */
  @IsString()
  name: string;

  /**
   * Caixa inicial das lojas em reais; se omitir, o serviço usa o padrão do jogo (700 mil).
   * Deixamos opcional para não obrigar repetir o número em todo cadastro, mas ainda permitir cenários customizados.
   */
  @IsNumber()
  @Min(0)
  @IsOptional()
  initialCash?: number;

  /** Demanda total do mercado simulado — base numérica usada em outras partes do sistema; deve ser positiva. */
  @IsNumber()
  @IsPositive()
  totalDemand: number;

  /**
   * Valores de disponibilidade, um por categoria de produto (ex: [600, 1500, 200, 1500]).
   * Opcional com fallback para null ou 0 (controlado pela lógica/default).
   */
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  disponibilidade?: number[];

  /**
   * Lista opcional de tetos de estoque por categoria; sem ela, o jogo usa os padrões do cadastro de categorias.
   * Útil quando o facilitador quer uma partida mais apertada ou mais folgada em determinadas linhas de produto.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryConfigDto)
  @IsOptional()
  categoryConfigs?: CategoryConfigDto[];

  /**
   * Parâmetros de CAPEX por sessão; sem eles, o jogo mantém os padrões do catálogo.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapexConfigDto)
  @IsOptional()
  capexConfigs?: CapexConfigDto[];

  /**
   * Salário por operador de caixa (R$).
   * Usado em: folha = (operadores de caixa × salário caixa) + (operadores de serviço × salário serviço).
   */
  @IsNumber()
  @IsPositive()
  cashierSalary: number;

  /**
   * Salário por operador de serviço (R$).
   * Usado em: folha = (operadores de caixa × salário caixa) + (operadores de serviço × salário serviço).
   */
  @IsNumber()
  @IsPositive()
  serviceSalary: number;

  /**
   * Custo base de licença de software (R$).
   * O custo final soma este valor aos deltas dos CAPEX implementados.
   */
  @IsNumber()
  @Min(0)
  baseLicenseCost: number;

  /**
   * Custo mensal de manutenção (R$).
   * CAPEX implementados podem reduzir este custo via maintenanceSaving.
   */
  @IsNumber()
  @Min(0)
  maintenanceCost: number;

  /**
   * Taxa de juros sobre caixa usado acima do limite.
   * Deve ser enviada em decimal: 0.12 = 12%.
   */
  @IsNumber()
  @Min(0)
  interestRate: number;

  @IsOptional()
  @IsBoolean()
  timerEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  timerDuration?: number;
}

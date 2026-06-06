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
  Max,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * Uma linha de configuração de estoque por categoria na sessão (quanto o “mercado” oferece naquela partida).
 */
export class CategoryConfigDto {
  /** Qual categoria do catálogo (UUID). */
  @IsUUID()
  categoryId!: string;

  /** Quantidade disponível na sessão para somar compras de todas as lojas (evita estoque infinito no jogo). */
  @IsInt()
  @IsPositive()
  stockAvailable!: number;
}

/**
 * Configuração de qual evento ocorrerá em qual rodada da sessão.
 */
export class EventConfigDto {
  /** O ID do evento no catálogo (EventTemplate) */
  @IsUUID()
  eventId!: string;

  /** A rodada em que o evento será ativado (1, 2 ou 3) */
  @IsInt()
  @Min(1)
  @Max(3)
  round!: number;
}

/**
 * Dados para criar uma nova sessão: nome, demanda total, caixa inicial opcional e ajustes de estoque por categoria.
 * Tudo é validado antes de chegar ao serviço — assim o facilitador não grava números inválidos que quebrariam o motor depois.
 */
export class CreateSessionDto {
  /** Nome da partida (ex.: “Turma manhã”). */
  @IsString()
  name!: string;

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
  totalDemand!: number;

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
   * Lista opcional de eventos predefinidos a serem disparados em rodadas específicas.
   * O sistema permite no máximo 1 evento por rodada.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventConfigDto)
  @IsOptional()
  eventConfigs?: EventConfigDto[];

  @IsOptional()
  @IsBoolean()
  timerEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  timerDuration?: number;
}

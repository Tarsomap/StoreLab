import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class AskAssistantDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(800)
  question: string;
}

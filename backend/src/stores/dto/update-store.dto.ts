import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}

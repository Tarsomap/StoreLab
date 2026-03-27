import { IsEnum, IsString } from 'class-validator';
import { StoreRole } from '@prisma/client';

export class JoinStoreDto {
  @IsString()
  accessCode: string;

  @IsEnum(StoreRole)
  role: StoreRole;
}

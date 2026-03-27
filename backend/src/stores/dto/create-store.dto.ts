import { IsString, IsUUID } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  name: string;

  @IsUUID()
  sessionId: string;
}

import { IsUUID } from 'class-validator';

export class TransferDto {
  @IsUUID()
  fromStoreId: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  toStoreId: string;
}

import { IsEmail, IsString } from 'class-validator';

export class Disable2faRecoveryDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

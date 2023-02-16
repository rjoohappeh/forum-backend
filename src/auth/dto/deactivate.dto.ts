import { IsNotEmpty, IsString } from 'class-validator';

export class DeactivateDto {
  @IsNotEmpty()
  @IsString()
  email: string;
}

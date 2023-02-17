import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class SetActiveDto {
  @IsNotEmpty()
  @IsString()
  email: string;
}

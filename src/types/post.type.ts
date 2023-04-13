import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  // TODO: add validation for this parameter and pipe the body value into an int
  authorId: number;
}

export class UpdatePostDto {
  @IsNumber()
  authorId: number;

  @IsNotEmpty()
  @IsString()
  newMessage: string;

  @IsNotEmpty()
  @IsDateString()
  createdAt: string;
}

export type PostWithAuthor = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  message: string;
  authorId: number;
  author: {
    displayName: string;
  };
};

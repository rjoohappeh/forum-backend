import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './types';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  async getPosts() {
    return this.prisma.post.findMany();
  }

  async createPost(dto: CreatePostDto) {
    return this.prisma.post
      .create({
        data: {
          ...dto,
        },
      })
      .catch((error) => {
        if (error.code === 'P2003') {
          throw new BadRequestException('No user with provided id exists');
        }
        throw error;
      });
  }
}

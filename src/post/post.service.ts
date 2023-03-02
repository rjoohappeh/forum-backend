import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto, PostWithAuthor } from '../types';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  getPosts(): Promise<PostWithAuthor[]> {
    return this.prisma.post.findMany({
      include: {
        author: {
          select: {
            displayName: true,
          },
        },
      },
    });
  }

  async createPost(dto: CreatePostDto): Promise<PostWithAuthor> {
    return this.prisma.post
      .create({
        data: {
          author: {
            connect: {
              id: Number(dto.authorId),
            },
          },
          message: dto.message,
        },
        include: {
          author: {
            select: {
              displayName: true,
            },
          },
        },
      })
      .catch(() => {
        throw new BadRequestException('No user with provided id exists');
      });
  }
}

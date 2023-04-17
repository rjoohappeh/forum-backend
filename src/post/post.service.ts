import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto, PostWithAuthor, UpdatePostDto } from '../types';

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

  async updatePost(dto: UpdatePostDto) {
    return this.prisma.post.updateMany({
      data: {
        message: dto.newMessage,
      },
      where: {
        authorId: dto.authorId,
        createdAt: dto.createdAt,
      },
    });
  }

  async deletePost(postId: number) {
    return this.prisma.post.delete({
      where: {
        id: postId,
      },
      select: {
        id: true,
      },
    });
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from '../types';
import { UserService } from '../user/user.service';

@Injectable()
export class PostService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  getPosts() {
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

  async createPost(dto: CreatePostDto) {
    return this.prisma.post
      .create({
        data: {
          author: {
            connect: {
              id: dto.authorId,
            },
          },
          message: dto.message,
        },
      })
      .catch(() => {
        throw new BadRequestException('No user with provided id exists');
      });
  }
}

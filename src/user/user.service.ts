import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { CreateUserDto, UpdateUserDto, UserWhereUniqueOptions } from '../types';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  async getUniqueUser(options: UserWhereUniqueOptions): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: {
        ...options,
      },
    });
    if (!user) {
      const errorMessage = options.id
        ? `id ${options.id}`
        : `email ${options.email}`;
      throw new NotFoundException(`No user found with ${errorMessage}`);
    }

    delete user.hash;
    delete user.hashedRt;

    return user;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: dto.email,
        hash: dto.hash,
      },
    });
  }

  async updateUser(
    whereOptions: UserWhereUniqueOptions,
    dto: UpdateUserDto,
  ): Promise<User> {
    return this.prisma.user.update({
      where: {
        ...whereOptions,
      },
      data: {
        ...dto,
      },
    });
  }

  async logoutUser(userId: number) {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        hashedRt: {
          not: null,
        },
      },
      data: {
        hashedRt: null,
      },
    });
  }
}

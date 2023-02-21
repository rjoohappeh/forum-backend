import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User } from '@prisma/client';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserWhereUniqueOptions,
} from '../../auth/types';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  async getUserByEmail(email: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
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
    whereOptions: UpdateUserWhereUniqueOptions,
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

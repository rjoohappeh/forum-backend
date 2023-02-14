import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException } from '@nestjs/common';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  const dto: AuthDto = {
    email: 'test@email.com',
    password: 'test123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, PrismaService, ConfigService, JwtService],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);

    await prismaService.cleanDb();
  });

  describe('signup', () => {
    it('should succeed if email is unique', async () => {
      const result = await authService.signup(dto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('should not succeed if email is not unique', async () => {
      await prismaService.user.create({
        data: {
          email: dto.email,
          hash: dto.password,
        },
      });
      await expect(() => authService.signup(dto)).rejects.toThrowError(
        new ForbiddenException('Credentials Taken'),
      );
    });

    it('should set hashedRt upon successful signup', async () => {
      await authService.signup(dto);

      const foundUser = await prismaService.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      expect(foundUser.hashedRt).not.toBeNull();
    });
  });

  describe('updateRtHash', () => {
    it('should update hashedRt in db', async () => {
      const savedUser = await prismaService.user.create({
        data: {
          email: dto.email,
          hash: dto.password,
        },
      });
      const refreshToken = 'fakeToken';
      await authService.updateRtHash(savedUser.id, refreshToken);

      const foundUser = await prismaService.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      expect(foundUser.hashedRt).not.toBeNull();
    });
  });
});

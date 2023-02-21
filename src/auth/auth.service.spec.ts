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
  let jwtService: JwtService;
  let configService: ConfigService;

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
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

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

  describe('signin', () => {
    it('should throw Forbidden Exception if email does not exist', async () => {
      await expect(() => authService.signin(dto)).rejects.toThrowError(
        new ForbiddenException('Access Denied'),
      );
    });

    it('should throw Forbidden Exception if password does not match', async () => {
      await prismaService.user.create({
        data: {
          email: dto.email,
          hash: await authService.hashData(dto.password),
        },
      });

      const signInDto: AuthDto = {
        email: dto.email,
        password: 'Wrong password123',
      };

      await expect(() => authService.signin(signInDto)).rejects.toThrowError(
        new ForbiddenException('Access Denied'),
      );
    });

    it('should succeed if email and password match', async () => {
      await prismaService.user.create({
        data: {
          email: dto.email,
          hash: await authService.hashData(dto.password),
        },
      });

      const result = await authService.signin(dto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });
  });

  describe('set account active/inactive', () => {
    it.each([[false], [true]])(
      'should succeed if token belongs to same user as the provided email',
      async (active: boolean) => {
        const savedUser = await prismaService.user.create({
          data: {
            email: dto.email,
            hash: await authService.hashData(dto.password),
          },
        });

        const token = await jwtService.signAsync(
          {
            sub: savedUser.id,
            email: savedUser.email,
          },
          {
            secret: configService.get('AT_SECRET'),
            expiresIn: 60 * 15,
          },
        );

        await authService.setActive(dto, token, active);

        const deactivatedUser = await prismaService.user.findUnique({
          where: {
            email: dto.email,
          },
        });

        expect(deactivatedUser.active).toBe(active);
      },
    );

    it('should throw a ForbiddenException if a token belonging to a different user is provided', async () => {
      const savedUser = await prismaService.user.create({
        data: {
          email: dto.email,
          hash: await authService.hashData(dto.password),
        },
      });

      const token = await jwtService.signAsync(
        {
          sub: savedUser.id,
          email: 'badEmail@email.com',
        },
        {
          secret: configService.get('AT_SECRET'),
          expiresIn: 60 * 15,
        },
      );

      await expect(() =>
        authService.setActive(dto, token, false),
      ).rejects.toThrow(new ForbiddenException('Access Denied'));
    });
  });

  describe('logout', () => {
    it('should set hashedRt to null', async () => {
      const { id } = await prismaService.user.create({
        data: {
          email: dto.email,
          hash: dto.password,
        },
      });

      await authService.logout(id);

      const foundUser = await prismaService.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      expect(foundUser.hashedRt).toBeNull();
    });
  });
});

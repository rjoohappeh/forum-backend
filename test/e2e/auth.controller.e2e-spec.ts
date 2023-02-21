import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as pactum from 'pactum';
import { AuthDto } from '../../src/auth/dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../src/auth/auth.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authService: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const dto: AuthDto = {
    email: 'test@email.com',
    password: 'test123',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      providers: [AuthService, PrismaService, ConfigService, JwtService],
    }).compile();
    app = moduleRef.createNestApplication();

    //validation pipe

    await app.init();
    await app.listen(3336);

    pactum.request.setBaseUrl('http://localhost:3336');

    prismaService = app.get<PrismaService>(PrismaService);
    authService = app.get<AuthService>(AuthService);
    jwtService = app.get<JwtService>(JwtService);
    configService = app.get<ConfigService>(ConfigService);
  });

  beforeEach(async () => {
    await prismaService.cleanDb();
  });

  afterAll(() => {
    app.close();
  });

  describe('auth', () => {
    describe('signup', () => {
      it('should return 403 when user signs up with email already in use', async () => {
        await prismaService.user.create({
          data: {
            email: dto.email,
            hash: dto.password,
          },
        });

        const expectedBody = {
          statusCode: 403,
          message: 'Credentials Taken',
          error: 'Forbidden',
        };

        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectBody(expectedBody);
      });

      it('should return 201 with tokens in body when successful signup', async () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(201)
          .expectBodyContains('access_token')
          .expectBodyContains('refresh_token');
      });
    });

    describe('signin', () => {
      beforeEach(async () => {
        await prismaService.user.create({
          data: {
            email: dto.email,
            hash: await authService.hashData(dto.password),
          },
        });
      });
      it('should return 403 when a login attempt is made with the wrong email', async () => {
        const userWithBadEmail: AuthDto = {
          email: 'wrongEmail@email.com',
          password: dto.password,
        };

        const expectedBody = {
          statusCode: 403,
          message: 'Access Denied',
          error: 'Forbidden',
        };

        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(userWithBadEmail)
          .expectBody(expectedBody);
      });

      it('should return 403 when a login attempt is made with the wrong password', async () => {
        const userWithBadEmail: AuthDto = {
          email: dto.email,
          password: 'wrong password',
        };

        const expectedBody = {
          statusCode: 403,
          message: 'Access Denied',
          error: 'Forbidden',
        };

        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(userWithBadEmail)
          .expectBody(expectedBody);
      });

      it('should return 200 when signin is successful', async () => {
        return pactum
          .spec()
          .post('/auth/signin')
          .withBody(dto)
          .expectStatus(201)
          .expectBodyContains('access_token')
          .expectBodyContains('refresh_token');
      });
    });

    describe('set account active/inactive', () => {
      let savedUser;

      beforeEach(async () => {
        savedUser = await prismaService.user.create({
          data: {
            email: dto.email,
            hash: await authService.hashData(dto.password),
          },
        });
      });

      it.each([
        ['/auth/deactivate', false],
        ['/auth/activate', true],
      ])(
        'should succeed if token and email provided are associated',
        async (requestPath: string, active: boolean) => {
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

          const body = {
            email: dto.email,
            password: dto.password,
          };

          return pactum
            .spec()
            .patch(requestPath)
            .withBody(body)
            .withHeaders({
              Authorization: `Bearer ${token}`,
            })
            .expectStatus(200)
            .expectBodyContains('test@email.com')
            .expectBodyContains(active);
        },
      );

      it.each([['/auth/deactivate'], ['/auth/activate']])(
        'should return 403 if email provided does not match email in token',
        async (requestPath: string) => {
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

          const body = {
            email: dto.email,
            password: dto.password,
          };

          const expectedBody = {
            statusCode: 403,
            message: 'Access Denied',
            error: 'Forbidden',
          };

          return pactum
            .spec()
            .patch(requestPath)
            .withBody(body)
            .withHeaders({
              Authorization: `Bearer ${token}`,
            })
            .expectBody(expectedBody);
        },
      );
    });

    describe('logout', () => {
      it('should return 200 if logout is successful', async () => {
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

        return pactum
          .spec()
          .post('/auth/logout')
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .expectStatus(200);
      });
    });
  });
});

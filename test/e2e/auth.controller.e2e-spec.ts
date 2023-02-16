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

    describe('deactivate account', () => {
      let savedUser;

      beforeEach(async () => {
        savedUser = await prismaService.user.create({
          data: {
            email: dto.email,
            hash: await authService.hashData(dto.password),
          },
        });
      });

      it('should succeed if token and email provided are associated', async () => {
        const token = await jwtService.signAsync(
          {
            sub: savedUser.id,
            email: savedUser.email,
          },
          {
            secret: 'at-secret',
            expiresIn: 60 * 15,
          },
        );

        const body = {
          email: dto.email,
        };

        return pactum
          .spec()
          .patch('/auth/deactivate')
          .withBody(body)
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .expectStatus(200)
          .expectBodyContains('test@email.com')
          .expectBodyContains(false);
      });

      it('should return 403 if email provided does not match email in token', async () => {
        const token = await jwtService.signAsync(
          {
            sub: savedUser.id,
            email: 'badEmail@email.com',
          },
          {
            secret: 'at-secret',
            expiresIn: 60 * 15,
          },
        );

        const body = {
          email: dto.email,
        };

        const expectedBody = {
          statusCode: 403,
          message: 'Access Denied',
          error: 'Forbidden',
        };

        return pactum
          .spec()
          .patch('/auth/deactivate')
          .withBody(body)
          .withHeaders({
            Authorization: `Bearer ${token}`,
          })
          .expectBody(expectedBody);
      });
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
            secret: 'at-secret',
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

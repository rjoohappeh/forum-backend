import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as pactum from 'pactum';
import { AuthDto } from '../../src/auth/dto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      providers: [PrismaService, ConfigService, JwtService],
    }).compile();
    app = moduleRef.createNestApplication();

    //validation pipe

    await app.init();
    await app.listen(3336);

    pactum.request.setBaseUrl('http://localhost:3336');

    prismaService = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await prismaService.cleanDb();
  });

  afterAll(() => {
    app.close();
  });

  describe('auth', () => {
    const dto: AuthDto = {
      email: 'test@email.com',
      password: 'test123',
    };
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

      it('should return 201 with tokens in body when successful login', async () => {
        const expectedBody = {
          statusCode: 201,
        };
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(201)
          .expectBodyContains('access_token')
          .expectBodyContains('refresh_token');
      });
    });
  });
});

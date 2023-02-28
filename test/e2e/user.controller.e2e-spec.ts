import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { INestApplication } from '@nestjs/common';
import * as pactum from 'pactum';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../src/user/user.service';

describe('User Controller', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let userService: UserService;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      providers: [PrismaService, JwtService, ConfigService, UserService],
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
    await app.listen(3336);

    pactum.request.setBaseUrl('http://localhost:3336');

    prismaService = app.get<PrismaService>(PrismaService);
    userService = app.get<UserService>(UserService);

    const jwtService = app.get<JwtService>(JwtService);
    const configService = app.get<ConfigService>(ConfigService);
    token = await jwtService.signAsync(
      {
        sub: 999,
        email: 'fakeUser@email.com',
      },
      {
        secret: configService.get('AT_SECRET'),
        expiresIn: 60 * 15,
      },
    );
  });

  beforeEach(async () => {
    await prismaService.cleanDb();
  });

  afterAll(() => {
    app.close();
  });

  describe('/users/id', () => {
    it('should return a 404 if no user is found with that id', async () => {
      return pactum
        .spec()
        .get('/users/1')
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(404)
        .expectBodyContains('No user found with id 1');
    });

    it('should return a 200 with the user in the body if the user exists', async () => {
      const user = await userService.createUser({
        email: 'test@email.com',
        hash: 'fakehash',
        displayName: 'fakeDisplayname',
      });

      delete user.hash;
      delete user.hashedRt;

      return pactum
        .spec()
        .get(`/users/${user.id}`)
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(200)
        .expectBodyContains(user.id)
        .expectBodyContains(user.active)
        .expectBodyContains(user.email);
    });
  });
});

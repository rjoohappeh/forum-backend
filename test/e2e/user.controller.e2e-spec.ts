import { INestApplication } from '@nestjs/common';
import { UserService } from '../../src/user/user.service';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as pactum from 'pactum';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

describe('User Controller', () => {
  let app: INestApplication;
  let userService: UserService;
  let prismaService: PrismaService;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      providers: [PrismaService, UserService, JwtService, ConfigService],
    }).compile();
    app = moduleRef.createNestApplication();

    await app.init();
    await app.listen(3336);

    pactum.request.setBaseUrl('http://localhost:3336');

    userService = app.get<UserService>(UserService);
    prismaService = app.get<PrismaService>(PrismaService);
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

  describe('get user by id', () => {
    let user: User;
    beforeEach(async () => {
      user = await userService.createUser({
        email: 'fakeUser@email.com',
        hash: 'fakehash',
        displayName: 'fakeDisplayName',
      });
    });

    it('should return the user with the given id', () => {
      return pactum
        .spec()
        .get(`/users/${user.id}`)
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(200)
        .expectBodyContains(user.displayName)
        .expectBodyContains(user.id);
    });

    it('should return a 404 if no user is found with the given id', () => {
      return pactum
        .spec()
        .get(`/users/${user.id + 1}`)
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(404);
    });
  });
});

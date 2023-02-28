import { AppModule } from '../../src/app.module';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as pactum from 'pactum';
import { PostService } from '../../src/post/post.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../src/user/user.service';

describe('Post controller', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let userService: UserService;
  let postService: PostService;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      providers: [
        PostService,
        PrismaService,
        JwtService,
        ConfigService,
        PostService,
      ],
    }).compile();
    app = moduleRef.createNestApplication();

    await app.init();
    await app.listen(3336);

    pactum.request.setBaseUrl('http://localhost:3336');

    prismaService = app.get<PrismaService>(PrismaService);
    postService = app.get<PostService>(PostService);
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

  describe('get all posts', () => {
    beforeEach(async () => {
      await userService.createUser({
        email: 'fakeUser@email.com',
        hash: 'fakehash',
      });
    });

    it('should return nothing if no posts exist', async () => {
      return pactum
        .spec()
        .get('/posts')
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(200)
        .expectBodyContains([]);
    });

    it('should return an array containing the posts if some exist', async () => {
      const { id } = await userService.getUserByEmail('fakeUser@email.com');
      const post = await postService.createPost(
        {
          message: 'Hello world',
        },
        id,
      );

      return pactum
        .spec()
        .get('/posts')
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(200)
        .expectBodyContains([post]);
    });
  });

  describe('create post', () => {
    beforeEach(async () => {
      await userService.createUser({
        email: 'fakeUser@email.com',
        hash: 'fakehash',
      });
    });

    it('should create a new post when authorId provided exists', async () => {
      const { id } = await userService.getUserByEmail('fakeUser@email.com');
      const body = {
        authorId: id,
        message: 'Hello world',
      };

      return pactum
        .spec()
        .post('/posts')
        .withBody(body)
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(201)
        .expectBodyContains('Hello world');
    });

    it('should return a 400 response if authorId provided does not exist', async () => {
      const body = {
        authorId: -400, // negative ids do not exist in the system
        message: 'Hello world',
      };

      return pactum
        .spec()
        .post('/posts')
        .withBody(body)
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(400);
    });
  });
});

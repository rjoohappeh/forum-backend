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
  let jwtService: JwtService;
  let configService: ConfigService;
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

    jwtService = app.get<JwtService>(JwtService);
    configService = app.get<ConfigService>(ConfigService);
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
        displayName: 'fakeDisplayName',
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
      const { id, displayName } = await userService.getUniqueUser({
        email: 'fakeUser@email.com',
      });
      const post = await postService.createPost({
        message: 'Hello world',
        authorId: id,
      });

      return pactum
        .spec()
        .get('/posts')
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(200)
        .expectBodyContains([
          {
            ...post,
            author: {
              displayName,
            },
          },
        ]);
    });
  });

  describe('create post', () => {
    beforeEach(async () => {
      await userService.createUser({
        email: 'fakeUser@email.com',
        hash: 'fakehash',
        displayName: 'fakeDisplayName',
      });
    });

    it('should create a new post when authorId provided exists', async () => {
      const { id } = await userService.getUniqueUser({
        email: 'fakeUser@email.com',
      });

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

  describe('update post', () => {
    let post;
    beforeEach(async () => {
      const user = await userService.createUser({
        email: 'fakeUser@email.com',
        hash: 'fakehash',
        displayName: 'fakeDisplayName',
      });
      post = await postService.createPost({
        message: 'hello message',
        authorId: user.id,
      });

      token = await jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
        },
        {
          secret: configService.get('AT_SECRET'),
          expiresIn: 60 * 15,
        },
      );
    });

    it('should return 400 status if userId does not match the userId in the accessToken', async () => {
      const body = {
        authorId: -1,
        createdAt: post.createdAt,
        newMessage: 'a new message',
      };

      return pactum
        .spec()
        .patch('/posts')
        .withBody(body)
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(400);
    });

    it('should update the post and return a 200 status if a post exists with the information provided', async () => {
      const body = {
        authorId: post.authorId,
        createdAt: post.createdAt,
        newMessage: 'a new message',
      };

      return pactum
        .spec()
        .patch('/posts')
        .withBody(body)
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(200)
        .expectBody({
          count: 1,
        });
    });
  });

  describe('delete post', () => {
    let post;
    beforeEach(async () => {
      const user = await userService.createUser({
        email: 'fakeUser@email.com',
        hash: 'fakehash',
        displayName: 'fakeDisplayName',
      });
      post = await postService.createPost({
        message: 'hello message',
        authorId: user.id,
      });
    });

    it('should delete the post if one is found with the given id', async () => {
      return pactum
        .spec()
        .delete(`/posts/${post.id}`)
        .withHeaders({
          Authorization: `Bearer ${token}`,
        })
        .expectStatus(200)
        .expectBody({
          id: post.id,
        });
    });
  });
});

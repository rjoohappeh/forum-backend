import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import * as pactum from 'pactum';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();

    //validation pipe

    await app.init();
    await app.listen(3333);

    pactum.request.setBaseUrl('http://localhost:3333');
  });

  describe('auth', () => {
    describe('signup', () => {
      it('should allow you to sign up', () => {
        return pactum
          .spec()
          .post('/auth/signup')
          .withBody({
            username: 'testUsername',
            password: 'testPassword',
          })
          .expectStatus(201);
      });
    });
  });
});

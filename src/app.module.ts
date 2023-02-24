import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AtGuard } from './auth/guards/at.guard';
import { UserModule } from './prisma/user/user.module';
import { PostModule } from './post/post.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    UserModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PostModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AtGuard,
    },
  ],
})
export class AppModule {}

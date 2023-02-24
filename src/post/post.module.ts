import { Global, Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Global()
@Module({
  providers: [PostService],
  exports: [PostService],
  controllers: [PostController],
})
export class PostModule {}

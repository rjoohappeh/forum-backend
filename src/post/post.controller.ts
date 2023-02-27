import { Body, Controller, Get, Post } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './types';
import { GetCurrentUserId } from '../common/decorators';

@Controller('/posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Get()
  getAllPosts() {
    return this.postService.getPosts();
  }

  @Post()
  createPost(@Body() dto: CreatePostDto, @GetCurrentUserId() userId: number) {
    return this.postService.createPost(dto, userId);
  }
}

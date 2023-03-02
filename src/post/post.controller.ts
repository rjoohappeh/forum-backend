import { Body, Controller, Get, Post } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from '../types';

@Controller('/posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Get()
  getAllPosts() {
    return this.postService.getPosts();
  }

  @Post()
  createPost(@Body() dto: CreatePostDto) {
    return this.postService.createPost(dto);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto, UpdatePostDto } from '../types';
import { GetCurrentUserId } from '../common/decorators';

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

  @Patch()
  updatePost(@Body() dto: UpdatePostDto, @GetCurrentUserId() userId: number) {
    if (userId !== dto.authorId) {
      throw new BadRequestException(
        'User attempting to update a post was not the creator of the post',
      );
    }
    return this.postService.updatePost(dto);
  }

  @Delete('/:id')
  deletePost(@Param('id', ParseIntPipe) postId: number) {
    return this.postService.deletePost(postId);
  }

  @Get('/user/:displayName')
  getPostsByDisplayName(@Param('displayName') displayName: string) {
    return this.postService.getPostsByDisplayName(displayName);
  }
}

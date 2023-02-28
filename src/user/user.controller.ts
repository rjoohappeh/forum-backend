import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '@prisma/client';

@Controller('/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('/:id')
  getUserById(@Param('id', new ParseIntPipe()) id): Promise<User> {
    return this.userService.getUniqueUser({ id });
  }
}

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';
import { Request } from 'express';
import { SetActiveDto } from './dto/deactivate.dto';
import {
  GetCurrentUserId,
  GetRequestToken,
  Public,
} from '../common/decorators';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('/signup')
  signup(@Body() dto: AuthDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('/signin')
  signin(@Body() dto: AuthDto) {
    return this.authService.signin(dto);
  }

  @Patch('/deactivate')
  deactivate(@Body() dto: SetActiveDto, @GetRequestToken() token: string) {
    return this.authService.setActive(dto.email, token, false);
  }

  @Patch('/activate')
  activate(@Body() dto: SetActiveDto, @GetRequestToken() token: string) {
    return this.authService.setActive(dto.email, token, true);
  }

  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetCurrentUserId() userId: number) {
    return this.authService.logout(userId);
  }
}

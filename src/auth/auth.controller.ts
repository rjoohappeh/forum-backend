import { Body, Controller, Param, Patch, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';
import { Request } from 'express';
import { DeactivateDto } from './dto/deactivate.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  signup(@Body() dto: AuthDto) {
    return this.authService.signup(dto);
  }

  @Post('/signin')
  signin(@Body() dto: AuthDto) {
    return this.authService.signin(dto);
  }

  @Patch('deactivate')
  deactivate(@Body() dto: DeactivateDto, @Req() req: Request) {
    const token = req.headers.authorization.split(' ')[1];
    return this.authService.deactivate(dto.email, token);
  }
}

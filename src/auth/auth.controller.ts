import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, SignUpDto } from './dto';
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
  signup(@Body() dto: SignUpDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('/signin')
  signin(@Body() dto: AuthDto) {
    return this.authService.signin(dto);
  }

  @Patch('/deactivate')
  deactivate(@Body() dto: AuthDto, @GetRequestToken() token: string) {
    return this.authService.setActive(dto, token, false);
  }

  @Patch('/activate')
  activate(@Body() dto: AuthDto, @GetRequestToken() token: string) {
    return this.authService.setActive(dto, token, true);
  }

  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetCurrentUserId() userId: number) {
    return this.authService.logout(userId);
  }
}

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AtStrategy } from './strategies';

@Module({
  imports: [JwtModule.register({})],
  providers: [AuthService, AtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}

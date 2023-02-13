import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, PrismaService, ConfigService, JwtService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signup', () => {
    it('should succeed if email is unique', async () => {
      const validSignupDto: AuthDto = {
        email: 'test@email.com',
        password: 'test123',
      };
      const result = await service.signup(validSignupDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });
  });
});

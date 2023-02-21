import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthDto } from './dto';
import { CreateUserDto, Tokens } from './types';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { UserService } from '../prisma/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: AuthDto): Promise<Tokens> {
    const hash = await this.hashData(dto.password);
    const createUserDto: CreateUserDto = {
      email: dto.email,
      hash,
    };
    try {
      const newUser = await this.userService.createUser(createUserDto);

      const tokens = await this.getTokens(newUser.id, newUser.email);
      await this.updateRtHash(newUser.id, tokens.refresh_token);
      return tokens;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ForbiddenException('Credentials Taken');
      }
      throw error;
    }
  }

  async signin(dto: AuthDto): Promise<Tokens> {
    const user = await this.userService.getUserByEmail(dto.email);

    this.validateUserData(user, dto.password);

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refresh_token);
    return tokens;
  }

  async hashData(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }

  validateUserData(user: User, password: string) {
    if (user == null) {
      throw new ForbiddenException('Access Denied');
    }

    if (!bcrypt.compareSync(password, user.hash)) {
      throw new ForbiddenException('Access Denied');
    }
  }

  async setActive(dto: AuthDto, token: string, active: boolean): Promise<User> {
    const user = await this.userService.getUserByEmail(dto.email);

    this.validateUserData(user, dto.password);

    const decodedToken = this.jwtService.decode(token);
    if (decodedToken != null) {
      const tokenEmail = decodedToken['email'];
      if (dto.email === tokenEmail) {
        return await this.updateActive(dto.email, active);
      }
    }
    throw new ForbiddenException('Access Denied');
  }

  async updateActive(email: string, active: boolean): Promise<User> {
    const deactivatedUser = await this.userService.updateUser(
      { email },
      {
        active,
      },
    );

    delete deactivatedUser.hash;
    delete deactivatedUser.hashedRt;

    return deactivatedUser;
  }

  async logout(userId: number): Promise<void> {
    await this.userService.logoutUser(userId);
  }

  async updateRtHash(userId: number, refreshToken: string): Promise<void> {
    const hash = await this.hashData(refreshToken);
    await this.userService.updateUser({ id: userId }, { hashedRt: hash });
  }

  async getTokens(userId: number, email: string): Promise<Tokens> {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email: email,
        },
        {
          secret: this.config.get('AT_SECRET'),
          expiresIn: 60 * 15,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email: email,
        },
        {
          secret: this.config.get('RT_SECRET'),
          expiresIn: 60 * 60 * 24 * 7,
        },
      ),
    ]);
    return {
      access_token: at,
      refresh_token: rt,
    };
  }
}

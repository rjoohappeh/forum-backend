import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthDto } from './dto';
import { CreateUserDto, Tokens } from './types';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: AuthDto): Promise<Tokens> {
    const { email, password } = dto;
    const hash = await this.hashData(password);
    const createUserDto: CreateUserDto = {
      email,
      hash,
    };
    try {
      const newUser = await this.userService.createUser(createUserDto);

      const tokens = await this.getTokens(newUser.id, email);
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
    const { email, password } = dto;
    const user = await this.userService.getUserByEmail(email);

    this.validateUserData(user, password);

    if (!user.active) {
      await this.userService.updateUser({ email }, { active: true });
    }
    const tokens = await this.getTokens(user.id, email);
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
    const { email, password } = dto;
    const user = await this.userService.getUserByEmail(email);

    this.validateUserData(user, password);

    const decodedToken = this.jwtService.decode(token);
    if (decodedToken != null) {
      const tokenEmail = decodedToken['email'];
      if (email === tokenEmail) {
        return await this.updateActive(email, active);
      }
    }
    throw new ForbiddenException('Access Denied');
  }

  async updateActive(email: string, active: boolean): Promise<User> {
    const user = await this.userService.updateUser(
      { email },
      {
        active,
      },
    );

    if (!active) {
      await this.logout(user.id);
    }
    delete user.hashedRt;

    return user;
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
          email,
        },
        {
          secret: this.config.get('AT_SECRET'),
          expiresIn: 60 * 15,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
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

import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { ApiException } from '@idp/common';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import { AuthenticatedUser } from '../security/jwt.strategy';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { LoginRequestDto } from './dto/login-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { RefreshRequestDto, LogoutRequestDto } from './dto/refresh-request.dto';

function clientIp(req: Request): string | null {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.ip ??
    null
  );
}

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUserUseCase,
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 900_000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() body: LoginRequestDto,
    @Req() req: Request,
  ) {
    try {
      return await this.loginUseCase.execute({
        email: body.email,
        password: body.password,
        ipAddress: clientIp(req),
      });
    } catch (err) {
      throw ApiException.unauthorized('Invalid credentials');
    }
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ auth: { limit: 10, ttl: 900_000 } })
  @ApiOperation({ summary: 'Register a new user account' })
  async register(
    @Body() body: RegisterRequestDto,
    @Req() req: Request,
  ) {
    return this.registerUseCase.execute({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      ipAddress: clientIp(req),
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ global: { limit: 30, ttl: 900_000 } })
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() body: RefreshRequestDto, @Req() req: Request) {
    try {
      return await this.refreshTokenUseCase.execute({
        refreshToken: body.refreshToken,
        ipAddress: clientIp(req),
      });
    } catch {
      throw ApiException.unauthorized('Invalid or expired refresh token');
    }
  }

  @Get('me')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.getCurrentUserUseCase.execute(user.userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(
    @Body() body: LogoutRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.logoutUseCase.execute({
      refreshToken: body.refreshToken,
      userId: user.userId,
      ipAddress: clientIp(req),
    });
  }
}
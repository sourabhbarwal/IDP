import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiException } from '@idp/common';
import {
  AccountNotActiveError,
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '../../domain/exceptions/domain-exceptions';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RegisterRequestDto } from './dto/register-request.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LogoutRequestDto, RefreshRequestDto } from './dto/refresh-request.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../infrastructure/security/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../infrastructure/security/jwt.strategy';

function clientIp(req: Request): string | null {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null;
}

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user (assigned the DEVELOPER role by default)' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() body: RegisterRequestDto, @Req() req: Request): Promise<UserResponseDto> {
    try {
      const user = await this.registerUserUseCase.execute({
        email: body.email,
        password: body.password,
        fullName: body.fullName,
        ipAddress: clientIp(req),
      });
      return UserResponseDto.fromDomain(user);
    } catch (err) {
      if (err instanceof EmailAlreadyRegisteredError) {
        throw ApiException.conflict(err.message);
      }
      throw err;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive an access + refresh token pair' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() body: LoginRequestDto, @Req() req: Request): Promise<AuthResponseDto> {
    try {
      const tokens = await this.loginUserUseCase.execute({
        email: body.email,
        password: body.password,
        ipAddress: clientIp(req),
      });
      return AuthResponseDto.fromTokens(tokens);
    } catch (err) {
      if (err instanceof InvalidCredentialsError || err instanceof AccountNotActiveError) {
        throw ApiException.unauthorized(err.message);
      }
      throw err;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access + refresh token pair (rotation)' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid, expired or reused refresh token' })
  async refresh(@Body() body: RefreshRequestDto, @Req() req: Request): Promise<AuthResponseDto> {
    try {
      const tokens = await this.refreshTokenUseCase.execute({
        refreshToken: body.refreshToken,
        ipAddress: clientIp(req),
      });
      return AuthResponseDto.fromTokens(tokens);
    } catch (err) {
      if (err instanceof InvalidRefreshTokenError) {
        throw ApiException.unauthorized(err.message);
      }
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the given refresh token (ends the current session)' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  async logout(
    @Body() body: LogoutRequestDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.logoutUseCase.execute({
      refreshToken: body.refreshToken,
      userId: user.userId,
      ipAddress: clientIp(req),
    });
  }
}

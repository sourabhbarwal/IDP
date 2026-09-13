import {
  Body, Controller, Delete, Get, HttpCode,
  HttpStatus, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiQuery, ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { RequirePermissions } from '../security/permissions.guard';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import { AuthenticatedUser } from '../security/jwt.strategy';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { UpdateUserRolesUseCase } from '../../application/use-cases/update-user-roles.use-case';
import { UpdateUserStatusUseCase } from '../../application/use-cases/update-user-status.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { UpdateUserRolesRequestDto } from './dto/update-user-roles-request.dto';
import { UpdateUserStatusRequestDto } from './dto/update-user-status-request.dto';
import { UserResponseDto } from './dto/auth-response.dto';

function clientIp(req: Request): string | null {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.ip ??
    null
  );
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/users')
export class UsersController {
  constructor(
    private readonly listUsers:        ListUsersUseCase,
    private readonly createUser:       CreateUserUseCase,
    private readonly updateUserRoles:  UpdateUserRolesUseCase,
    private readonly updateUserStatus: UpdateUserStatusUseCase,
    private readonly deleteUser:       DeleteUserUseCase,
    private readonly getCurrentUser:   GetCurrentUserUseCase,
  ) {}

  // ── GET /api/v1/users/me ─────────────────────────────────────────────────
  // Must come before /:id so it doesn't get matched as an ID param.
  @Get('me')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get current authenticated user (alias for /auth/me)' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.getCurrentUser.execute(user.userId);
  }

  // ── ADMIN-ONLY endpoints ─────────────────────────────────────────────────
  @Get()
  @SkipThrottle()
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'List all platform users (admin only)' })
  @ApiQuery({ name: 'page',   required: false, type: Number })
  @ApiQuery({ name: 'size',   required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role',   required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async listAll(
    @Query('page')   page = 0,
    @Query('size')   size = 20,
    @Query('search') search?: string,
    @Query('role')   role?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.listUsers.execute({
      page: Number(page),
      size: Number(size),
      search,
      role,
      status,
    });
    return {
      content: result.content.map(UserResponseDto.fromDomain),
      totalElements: result.totalElements,
      page: result.page,
      size: result.size,
      totalPages: result.totalPages,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user:create')
  @ApiOperation({ summary: 'Create a new user with specific roles (admin only)' })
  async create(
    @Body() body: CreateUserRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const user = await this.createUser.execute({
      email:     body.email,
      password:  body.password,
      fullName:  body.fullName,
      roles:     body.roles,
      actorId:   actor.userId,
      ipAddress: clientIp(req),
    });
    return UserResponseDto.fromDomain(user);
  }

  @Get(':id')
  @SkipThrottle()
  @RequirePermissions('user:read')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  async getById(@Param('id') id: string) {
    return this.getCurrentUser.execute(id);
  }

  @Patch(':id/roles')
  @RequirePermissions('user:manage')
  @ApiOperation({ summary: 'Update user roles (admin only)' })
  async updateRoles(
    @Param('id') id: string,
    @Body() body: UpdateUserRolesRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const user = await this.updateUserRoles.execute({
      targetUserId: id,
      roles:        body.roles,
      actorId:      actor.userId,
      ipAddress:    clientIp(req),
    });
    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id/status')
  @RequirePermissions('user:manage')
  @ApiOperation({ summary: 'Activate or deactivate a user (admin only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const user = await this.updateUserStatus.execute({
      targetUserId: id,
      status:       body.status,
      actorId:      actor.userId,
      ipAddress:    clientIp(req),
    });
    return UserResponseDto.fromDomain(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('user:manage')
  @ApiOperation({ summary: 'Soft delete a user (admin only)' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    await this.deleteUser.execute({
      targetUserId: id,
      actorId:      actor.userId,
      ipAddress:    clientIp(req),
    });
  }
}
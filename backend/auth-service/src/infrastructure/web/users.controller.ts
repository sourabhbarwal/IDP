import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiException } from '@idp/common';
import { UserNotFoundError } from '../../domain/exceptions/domain-exceptions';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import { AuthenticatedUser } from '../security/jwt.strategy';
import { UserResponseDto } from './dto/auth-response.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly getCurrentUserUseCase: GetCurrentUserUseCase) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the currently authenticated user profile, roles and permissions' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    try {
      const domainUser = await this.getCurrentUserUseCase.execute(user.userId);
      return UserResponseDto.fromDomain(domainUser);
    } catch (err) {
      if (err instanceof UserNotFoundError) {
        throw ApiException.notFound('User', user.userId);
      }
      throw err;
    }
  }
}

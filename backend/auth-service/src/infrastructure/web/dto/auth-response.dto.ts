import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../domain/entities/user.entity';
import { AuthTokens } from '../../../application/use-cases/login-user.use-case';

export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ type: [String] }) roles!: string[];
  @ApiProperty({ type: [String] }) permissions!: string[];
  @ApiProperty() createdAt!: string;

  static fromDomain(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.fullName = user.fullName;
    dto.status = user.status;
    dto.roles = user.roleNames();
    dto.permissions = user.permissions();
    dto.createdAt = user.createdAt.toISOString();
    return dto;
  }
}

export class AuthResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ example: 'Bearer' }) tokenType!: string;
  @ApiProperty() expiresInSeconds!: number;
  @ApiProperty() refreshTokenExpiresInSeconds!: number;
  @ApiProperty({ type: UserResponseDto }) user!: UserResponseDto;

  static fromTokens(tokens: AuthTokens): AuthResponseDto {
    const dto = new AuthResponseDto();
    dto.accessToken = tokens.accessToken;
    dto.refreshToken = tokens.refreshToken;
    dto.tokenType = 'Bearer';
    dto.expiresInSeconds = tokens.accessTokenExpiresInSeconds;
    dto.refreshTokenExpiresInSeconds = tokens.refreshTokenExpiresInSeconds;
    dto.user = UserResponseDto.fromDomain(tokens.user);
    return dto;
  }
}

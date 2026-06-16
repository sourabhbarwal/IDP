import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshRequestDto {
  @ApiProperty({ description: 'Opaque refresh token issued at login/refresh time' })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class LogoutRequestDto {
  @ApiProperty({ description: 'Refresh token to revoke' })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

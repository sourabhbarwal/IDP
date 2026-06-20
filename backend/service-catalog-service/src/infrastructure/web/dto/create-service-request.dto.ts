import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ServiceType } from '../../../domain/enums/service-type.enum';

export class CreateServiceRequestDto {
  @ApiProperty({ example: 'user-auth-service' })
  @IsString() @MinLength(2) @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Handles user authentication and authorization' })
  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: ServiceType, example: ServiceType.NODEJS })
  @IsEnum(ServiceType)
  type!: ServiceType;

  @ApiPropertyOptional({ example: 'platform-team' })
  @IsOptional() @IsString() @MaxLength(100)
  team?: string;

  @ApiPropertyOptional({ example: 'https://github.com/org/repo' })
  @IsOptional() @IsUrl()
  repositoryUrl?: string;

  @ApiPropertyOptional({ type: [String], example: ['auth', 'nodejs'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}
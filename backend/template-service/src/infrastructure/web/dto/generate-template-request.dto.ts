import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateType } from '../../../domain/enums/template-type.enum';

export class GenerateTemplateRequestDto {
  @ApiProperty({ example: 'my-payments-service' })
  @IsString() @IsNotEmpty()
  serviceName!: string;

  @ApiPropertyOptional({ example: 'Handles all payment processing' })
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 3000, minimum: 1024, maximum: 65535 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1024) @Max(65535)
  port?: number;

  @ApiPropertyOptional({ example: 'com.myorg', description: 'Java package name (Spring Boot only)' })
  @IsOptional() @IsString()
  packageName?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional() @IsString()
  author?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional() @IsString()
  authorEmail?: string;
}
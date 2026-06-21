import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { RepositoryVisibility } from '../../../domain/enums/repository-visibility.enum';

export class ProvisionRepositoryRequestDto {
  @ApiProperty({ description: 'Service Catalog service ID' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ description: 'Service name (will become the repo name)' })
  @IsString() @IsNotEmpty()
  serviceName!: string;

  @ApiProperty({ description: 'Service type: NODEJS, SPRING_BOOT, FASTAPI, GO, OTHER' })
  @IsString() @IsNotEmpty()
  serviceType!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: RepositoryVisibility, default: RepositoryVisibility.PRIVATE })
  @IsOptional() @IsEnum(RepositoryVisibility)
  visibility?: RepositoryVisibility;
}
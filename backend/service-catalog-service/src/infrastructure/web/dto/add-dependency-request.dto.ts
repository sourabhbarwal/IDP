import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DependencyType } from '../../../domain/enums/dependency-type.enum';

export class AddDependencyRequestDto {
  @ApiProperty({ description: 'ID of the service this service depends on' })
  @IsUUID()
  dependencyId!: string;

  @ApiProperty({ enum: DependencyType, default: DependencyType.HARD })
  @IsEnum(DependencyType)
  dependencyType!: DependencyType;

  @ApiPropertyOptional({ description: 'Human-readable description of the dependency' })
  @IsOptional()
  @IsString()
  description?: string;
}
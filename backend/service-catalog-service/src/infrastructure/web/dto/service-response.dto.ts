import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Service } from '../../../domain/entities/service.entity';
import { ServiceVersion } from '../../../domain/entities/service-version.entity';

export class ServiceVersionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() version!: string;
  @ApiPropertyOptional() changelog!: string | null;
  @ApiPropertyOptional() deployedAt!: string | null;
  @ApiPropertyOptional() environment!: string | null;
  @ApiProperty() createdAt!: string;

  static fromDomain(v: ServiceVersion): ServiceVersionResponseDto {
    const dto = new ServiceVersionResponseDto();
    dto.id = v.id;
    dto.version = v.version;
    dto.changelog = v.changelog;
    dto.deployedAt = v.deployedAt?.toISOString() ?? null;
    dto.environment = v.environment;
    dto.createdAt = v.createdAt.toISOString();
    return dto;
  }
}

export class ServiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description!: string | null;
  @ApiProperty() type!: string;
  @ApiProperty() status!: string;
  @ApiProperty() ownerId!: string;
  @ApiProperty() ownerEmail!: string;
  @ApiPropertyOptional() team!: string | null;
  @ApiPropertyOptional() repositoryUrl!: string | null;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ type: [ServiceVersionResponseDto] }) versions!: ServiceVersionResponseDto[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static fromDomain(s: Service): ServiceResponseDto {
    const dto = new ServiceResponseDto();
    dto.id = s.id;
    dto.name = s.name;
    dto.description = s.description;
    dto.type = s.type;
    dto.status = s.status;
    dto.ownerId = s.ownerId;
    dto.ownerEmail = s.ownerEmail;
    dto.team = s.team;
    dto.repositoryUrl = s.repositoryUrl;
    dto.tags = s.tags;
    dto.versions = s.versions.map(ServiceVersionResponseDto.fromDomain);
    dto.createdAt = s.createdAt.toISOString();
    dto.updatedAt = s.updatedAt.toISOString();
    return dto;
  }
}
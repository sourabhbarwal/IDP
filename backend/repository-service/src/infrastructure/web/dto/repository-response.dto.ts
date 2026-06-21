import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Repository } from '../../../domain/entities/repository.entity';

export class RepositoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() serviceId!: string;
  @ApiProperty() serviceName!: string;
  @ApiProperty() serviceType!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() htmlUrl!: string;
  @ApiProperty() cloneUrl!: string;
  @ApiProperty() sshUrl!: string;
  @ApiProperty() defaultBranch!: string;
  @ApiProperty() visibility!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() errorMessage!: string | null;
  @ApiProperty() provisionedBy!: string;
  @ApiProperty() provisionedAt!: string;
  @ApiProperty() createdAt!: string;

  static fromDomain(r: Repository): RepositoryResponseDto {
    const dto = new RepositoryResponseDto();
    dto.id = r.id;
    dto.serviceId = r.serviceId;
    dto.serviceName = r.serviceName;
    dto.serviceType = r.serviceType;
    dto.fullName = r.fullName;
    dto.htmlUrl = r.htmlUrl;
    dto.cloneUrl = r.cloneUrl;
    dto.sshUrl = r.sshUrl;
    dto.defaultBranch = r.defaultBranch;
    dto.visibility = r.visibility;
    dto.status = r.status;
    dto.errorMessage = r.errorMessage;
    dto.provisionedBy = r.provisionedBy;
    dto.provisionedAt = r.provisionedAt.toISOString();
    dto.createdAt = r.createdAt.toISOString();
    return dto;
  }
}
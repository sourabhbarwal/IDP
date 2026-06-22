import { ApiProperty } from '@nestjs/swagger';
import { Template } from '../../../domain/entities/template.entity';

export class TemplateResponseDto {
  @ApiProperty() type!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() language!: string;
  @ApiProperty() framework!: string;
  @ApiProperty() version!: string;
  @ApiProperty({ type: [String] }) features!: string[];
  @ApiProperty({ type: [String] }) includedFiles!: string[];

  static fromDomain(t: Template): TemplateResponseDto {
    const dto = new TemplateResponseDto();
    dto.type = t.metadata.type;
    dto.name = t.metadata.name;
    dto.description = t.metadata.description;
    dto.language = t.metadata.language;
    dto.framework = t.metadata.framework;
    dto.version = t.metadata.version;
    dto.features = t.metadata.features;
    dto.includedFiles = t.metadata.includedFiles;
    return dto;
  }
}
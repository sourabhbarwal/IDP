import { Injectable } from '@nestjs/common';
import { TemplateRegistryService } from '../services/template-registry.service';
import { ZipBuilderService } from '../services/zip-builder.service';
import { GenerationParams } from '../../domain/entities/template.entity';

export interface GenerateTemplateCommand {
  templateType: string;
  params: GenerationParams;
}

@Injectable()
export class GenerateTemplateUseCase {
  constructor(
    private readonly registry: TemplateRegistryService,
    private readonly zipBuilder: ZipBuilderService,
  ) {}

  async execute(command: GenerateTemplateCommand): Promise<Buffer> {
    const template = this.registry.findByType(command.templateType);
    const files = template.generate(command.params);
    return this.zipBuilder.buildZip(files);
  }
}
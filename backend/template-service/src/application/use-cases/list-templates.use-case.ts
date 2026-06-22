import { Injectable } from '@nestjs/common';
import { TemplateRegistryService } from '../services/template-registry.service';
import { Template } from '../../domain/entities/template.entity';

@Injectable()
export class ListTemplatesUseCase {
  constructor(private readonly registry: TemplateRegistryService) {}

  execute(): Template[] {
    return this.registry.listAll();
  }
}
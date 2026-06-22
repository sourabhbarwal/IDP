import { TemplateType } from '../enums/template-type.enum';

export interface TemplateFile {
  path: string;
  content: string;
}

export interface TemplateMetadata {
  type: TemplateType;
  name: string;
  description: string;
  language: string;
  framework: string;
  version: string;
  features: string[];
  includedFiles: string[];
}

export interface GenerationParams {
  serviceName: string;
  description: string;
  port: number;
  packageName: string; // e.g. com.example for Spring Boot
  author: string;
  authorEmail: string;
}

/**
 * A Template is a blueprint that knows its own metadata and can generate
 * its files given generation parameters. Pure domain object.
 */
export class Template {
  constructor(
    public readonly metadata: TemplateMetadata,
    private readonly generator: (params: GenerationParams) => TemplateFile[],
  ) {}

  generate(params: GenerationParams): TemplateFile[] {
    return this.generator(params);
  }

  get type(): TemplateType { return this.metadata.type; }
  get name(): string { return this.metadata.name; }
}
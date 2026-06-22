export type TemplateType = 'NODEJS' | 'FASTAPI' | 'GO' | 'SPRING_BOOT';

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
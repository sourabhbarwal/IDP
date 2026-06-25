import { ListTemplatesUseCase } from './list-templates.use-case';
import { TemplateRegistryService } from '../services/template-registry.service';
import { TemplateType } from '../../domain/enums/template-type.enum';

describe('ListTemplatesUseCase', () => {
  let useCase: ListTemplatesUseCase;

  beforeEach(() => {
    useCase = new ListTemplatesUseCase(new TemplateRegistryService());
  });

  it('returns all 4 templates', () => {
    const templates = useCase.execute();
    expect(templates).toHaveLength(4);
  });

  it('returns templates for all expected types', () => {
    const types = useCase.execute().map((t) => t.type);
    expect(types).toContain(TemplateType.NODEJS);
    expect(types).toContain(TemplateType.FASTAPI);
    expect(types).toContain(TemplateType.GO);
    expect(types).toContain(TemplateType.SPRING_BOOT);
  });

  it('each template has required metadata fields', () => {
    const templates = useCase.execute();
    templates.forEach((t) => {
      expect(t.metadata.name).toBeTruthy();
      expect(t.metadata.description).toBeTruthy();
      expect(t.metadata.language).toBeTruthy();
      expect(t.metadata.features.length).toBeGreaterThan(0);
    });
  });
});
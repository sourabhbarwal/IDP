import { ListTemplatesUseCase } from './list-templates.use-case';
import { TemplateRegistryService } from '../services/template-registry.service';

describe('ListTemplatesUseCase', () => {
  let useCase: ListTemplatesUseCase;
  let registry: TemplateRegistryService;

  beforeEach(() => {
    registry = new TemplateRegistryService();
    useCase = new ListTemplatesUseCase(registry);
  });

  it('lists all templates from the registry', () => {
    const result = useCase.execute();
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.name)).toContain('Go');
  });
});

import { TemplateRegistryService } from './template-registry.service';
import { TemplateType } from '../../domain/enums/template-type.enum';
import { TemplateNotFoundError } from '../../domain/exceptions/domain-exceptions';

describe('TemplateRegistryService', () => {
  let service: TemplateRegistryService;
  beforeEach(() => { service = new TemplateRegistryService(); });

  it('listAll() returns all 4 templates', () => {
    const templates = service.listAll();
    expect(templates).toHaveLength(4);
  });

  it('findByType() returns correct template for each type', () => {
    for (const type of Object.values(TemplateType)) {
      const template = service.findByType(type);
      expect(template.type).toBe(type);
    }
  });

  it('findByType() throws TemplateNotFoundError for unknown type', () => {
    expect(() => service.findByType('UNKNOWN')).toThrow(TemplateNotFoundError);
  });

  it('each template generates files when called with valid params', () => {
    const params = {
      serviceName: 'test-svc', description: 'test', port: 3000,
      packageName: 'com.example', author: 'Test', authorEmail: 'test@test.com',
    };
    for (const type of Object.values(TemplateType)) {
      const template = service.findByType(type);
      const files = template.generate(params);
      expect(files.length).toBeGreaterThan(5);
      expect(files.every((f) => typeof f.content === 'string' && f.content.length >= 0)).toBe(true);
    }
  });
});
import { GenerateTemplateUseCase } from './generate-template.use-case';
import { TemplateRegistryService } from '../services/template-registry.service';
import { ZipBuilderService } from '../services/zip-builder.service';
import { TemplateType } from '../../domain/enums/template-type.enum';
import { TemplateNotFoundError } from '../../domain/exceptions/domain-exceptions';

describe('GenerateTemplateUseCase', () => {
  let useCase: GenerateTemplateUseCase;
  let registry: TemplateRegistryService;
  let zipBuilder: ZipBuilderService;

  beforeEach(() => {
    registry = new TemplateRegistryService();
    zipBuilder = new ZipBuilderService();
    useCase = new GenerateTemplateUseCase(registry, zipBuilder);
  });

  it('generates template files and returns a valid zip buffer', async () => {
    const command = {
      templateType: TemplateType.NODEJS,
      params: {
        serviceName: 'my-service',
        description: 'test description',
        port: 3000,
        packageName: '',
        author: 'Author',
        authorEmail: 'author@test.com',
      },
    };

    const zipBuffer = await useCase.execute(command);
    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(zipBuffer.length).toBeGreaterThan(0);
  });

  it('throws TemplateNotFoundError for invalid template type', async () => {
    const command = {
      templateType: 'INVALID_TYPE',
      params: {
        serviceName: 'my-service',
        description: 'test description',
        port: 3000,
        packageName: '',
        author: 'Author',
        authorEmail: 'author@test.com',
      },
    };

    await expect(useCase.execute(command)).rejects.toThrow(TemplateNotFoundError);
  });
});

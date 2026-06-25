import { GenerateTemplateUseCase } from './generate-template.use-case';
import { TemplateRegistryService } from '../services/template-registry.service';
import { ZipBuilderService } from '../services/zip-builder.service';
import { TemplateType } from '../../domain/enums/template-type.enum';

describe('GenerateTemplateUseCase', () => {
  let useCase: GenerateTemplateUseCase;
  let zipBuilder: ZipBuilderService;

  const params = {
    serviceName: 'test-service',
    description: 'A test service',
    port: 3000,
    packageName: 'com.example',
    author: 'Test User',
    authorEmail: 'test@example.com',
  };

  beforeEach(() => {
    zipBuilder = new ZipBuilderService();
    useCase = new GenerateTemplateUseCase(new TemplateRegistryService(), zipBuilder);
  });

  it('generates a zip buffer for NODEJS template', async () => {
    const buffer = await useCase.execute({
      templateType: TemplateType.NODEJS,
      params,
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
  });

  it('generates a zip buffer for FASTAPI template', async () => {
    const buffer = await useCase.execute({
      templateType: TemplateType.FASTAPI,
      params,
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
  });

  it('generates a zip buffer for GO template', async () => {
    const buffer = await useCase.execute({
      templateType: TemplateType.GO,
      params: { ...params, packageName: 'github.com/test/test-service' },
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
  });

  it('generates a zip buffer for SPRING_BOOT template', async () => {
    const buffer = await useCase.execute({
      templateType: TemplateType.SPRING_BOOT,
      params,
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
  });

  it('throws for unknown template type', async () => {
    await expect(
      useCase.execute({ templateType: 'UNKNOWN', params }),
    ).rejects.toThrow();
  });
});
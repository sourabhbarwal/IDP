import { ZipBuilderService } from './zip-builder.service';
import JSZip from 'jszip';

describe('ZipBuilderService', () => {
  let service: ZipBuilderService;

  beforeEach(() => {
    service = new ZipBuilderService();
  });

  it('builds a valid zip buffer from a list of files', async () => {
    const files = [
      { path: 'test.txt', content: 'hello world' },
      { path: 'src/app.ts', content: 'console.log("hello");' },
    ];

    const zipBuffer = await service.buildZip(files);
    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(zipBuffer.length).toBeGreaterThan(0);

    // Verify zip content
    const zip = await JSZip.loadAsync(zipBuffer);
    const testFile = zip.file('test.txt');
    expect(testFile).not.toBeNull();
    const testContent = await testFile!.async('string');
    expect(testContent).toBe('hello world');

    const tsFile = zip.file('src/app.ts');
    expect(tsFile).not.toBeNull();
    const tsContent = await tsFile!.async('string');
    expect(tsContent).toBe('console.log("hello");');
  });
});

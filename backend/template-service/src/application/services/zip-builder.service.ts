import { Injectable } from '@nestjs/common';
import JSZip from 'jszip';
import { TemplateFile } from '../../domain/entities/template.entity';

@Injectable()
export class ZipBuilderService {
  async buildZip(files: TemplateFile[]): Promise<Buffer> {
    const zip = new JSZip();

    for (const file of files) {
      zip.file(file.path, file.content);
    }

    return zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    }) as Promise<Buffer>;
  }
}
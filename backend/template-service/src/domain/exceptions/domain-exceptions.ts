export class TemplateNotFoundError extends Error {
  constructor(type: string) {
    super(`Template type '${type}' is not available`);
    this.name = 'TemplateNotFoundError';
  }
}
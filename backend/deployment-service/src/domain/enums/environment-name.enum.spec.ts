import { EnvironmentName, namespacePrefix, nextEnvironment, PROMOTION_ORDER } from './environment-name.enum';

describe('environment-name enum helpers', () => {
  it('namespacePrefix maps each environment correctly', () => {
    expect(namespacePrefix(EnvironmentName.DEVELOPMENT)).toBe('dev');
    expect(namespacePrefix(EnvironmentName.TESTING)).toBe('test');
    expect(namespacePrefix(EnvironmentName.STAGING)).toBe('staging');
    expect(namespacePrefix(EnvironmentName.PRODUCTION)).toBe('prod');
  });

  it('PROMOTION_ORDER has 4 environments in correct sequence', () => {
    expect(PROMOTION_ORDER).toEqual([
      EnvironmentName.DEVELOPMENT,
      EnvironmentName.TESTING,
      EnvironmentName.STAGING,
      EnvironmentName.PRODUCTION,
    ]);
  });

  it('nextEnvironment progresses dev -> test -> staging -> prod', () => {
    expect(nextEnvironment(EnvironmentName.DEVELOPMENT)).toBe(EnvironmentName.TESTING);
    expect(nextEnvironment(EnvironmentName.TESTING)).toBe(EnvironmentName.STAGING);
    expect(nextEnvironment(EnvironmentName.STAGING)).toBe(EnvironmentName.PRODUCTION);
  });

  it('nextEnvironment returns null after PRODUCTION', () => {
    expect(nextEnvironment(EnvironmentName.PRODUCTION)).toBeNull();
  });
});
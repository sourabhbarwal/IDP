import { RefreshToken } from './refresh-token.entity';

function makeToken(overrides: Partial<ConstructorParameters<typeof RefreshToken>[0]> = {}): RefreshToken {
  return new RefreshToken({
    id: 'token-1',
    userId: 'user-1',
    tokenHash: 'abc123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
    revokedAt: null,
    replacedByTokenId: null,
    createdByIp: '127.0.0.1',
    createdAt: new Date(),
    ...overrides,
  });
}

describe('RefreshToken domain entity', () => {
  it('isExpired() returns false for a future expiry', () => {
    const token = makeToken();
    expect(token.isExpired()).toBe(false);
  });

  it('isExpired() returns true when expiry is in the past', () => {
    const token = makeToken({ expiresAt: new Date(Date.now() - 1000) });
    expect(token.isExpired()).toBe(true);
  });

  it('isRevoked() returns false when revokedAt is null', () => {
    const token = makeToken({ revokedAt: null });
    expect(token.isRevoked()).toBe(false);
  });

  it('isRevoked() returns true when revokedAt is set', () => {
    const token = makeToken({ revokedAt: new Date() });
    expect(token.isRevoked()).toBe(true);
  });

  it('isActive() returns true for a non-expired, non-revoked token', () => {
    const token = makeToken();
    expect(token.isActive()).toBe(true);
  });

  it('isActive() returns false for an expired token', () => {
    const token = makeToken({ expiresAt: new Date(Date.now() - 1000) });
    expect(token.isActive()).toBe(false);
  });

  it('isActive() returns false for a revoked token', () => {
    const token = makeToken({ revokedAt: new Date() });
    expect(token.isActive()).toBe(false);
  });
});

export interface RefreshTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
  createdByIp: string | null;
  createdAt: Date;
}

/**
 * Refresh token domain entity implementing rotation/replay-detection rules
 * described in ADR-0003.
 */
export class RefreshToken {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly replacedByTokenId: string | null;
  readonly createdByIp: string | null;
  readonly createdAt: Date;

  constructor(props: RefreshTokenProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.tokenHash = props.tokenHash;
    this.expiresAt = props.expiresAt;
    this.revokedAt = props.revokedAt;
    this.replacedByTokenId = props.replacedByTokenId;
    this.createdByIp = props.createdByIp;
    this.createdAt = props.createdAt;
  }

  isExpired(now: Date = new Date()): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  /** A token is usable for refresh only if it is neither expired nor revoked. */
  isActive(now: Date = new Date()): boolean {
    return !this.isExpired(now) && !this.isRevoked();
  }
}

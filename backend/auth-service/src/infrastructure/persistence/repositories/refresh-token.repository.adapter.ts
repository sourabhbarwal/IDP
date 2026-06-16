import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.port';
import { RefreshTokenOrmEntity } from '../orm-entities/refresh-token.orm-entity';
import { toDomainRefreshToken } from './entity-mappers';

@Injectable()
export class RefreshTokenRepositoryAdapter implements RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenOrmEntity) private readonly tokens: Repository<RefreshTokenOrmEntity>,
  ) {}

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const entity = await this.tokens.findOne({ where: { tokenHash } });
    return entity ? toDomainRefreshToken(entity) : null;
  }

  async create(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdByIp: string | null;
  }): Promise<RefreshToken> {
    const entity = this.tokens.create({
      userId: params.userId,
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
      createdByIp: params.createdByIp,
      revokedAt: null,
      replacedByTokenId: null,
    });
    const saved = await this.tokens.save(entity);
    return toDomainRefreshToken(saved);
  }

  async revoke(id: string, replacedByTokenId: string | null): Promise<void> {
    await this.tokens.update({ id }, { revokedAt: new Date(), replacedByTokenId });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.tokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasher } from '../../application/ports/password-hasher.port';

const BCRYPT_SALT_ROUNDS = 12; // per ADR-0003

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, BCRYPT_SALT_ROUNDS);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}

import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import type { PasswordHasher } from './types.ts';
import { logger } from '../config/logger.ts';

export class Argon2PasswordHasher implements PasswordHasher {
  /**
   * Hashes a plain-text password using Argon2id with secure memory and time cost parameters.
   */
  async hash(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password cannot be empty');
    }
    try {
      return await argon2Hash(password, {
        algorithm: 2, // Argon2id
        memoryCost: 2 ** 16, // 64 MB
        timeCost: 3,
        parallelism: 1,
      });
    } catch (err: unknown) {
      logger.error('Failed to hash password with Argon2', {
        error: err instanceof Error ? err.message : 'Unknown hashing error',
      });
      throw new Error('Failed to hash password safely');
    }
  }

  /**
   * Verifies a plain-text password against an Argon2 hash.
   * Never throws on invalid hashes or mismatched passwords, returning false instead.
   */
  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    try {
      return await argon2Verify(hash, password);
    } catch (err: unknown) {
      logger.warn('Failed password verification attempt or malformed hash');
      return false;
    }
  }
}

export const argon2Hasher = new Argon2PasswordHasher();

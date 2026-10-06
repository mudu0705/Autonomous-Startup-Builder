import type { AuthTokenPayload } from '../../../shared/types/user.ts';

// AuthSession is defined in shared/types/auth.ts for cross-boundary use
export type { AuthSession } from '../../../shared/types/auth.ts';

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface TokenManager {
  sign(payload: AuthTokenPayload): string;
  verify(token: string): AuthTokenPayload;
}


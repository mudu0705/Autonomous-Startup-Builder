import type { User } from './user.ts';

/**
 * AuthSession is the shape returned by register/login endpoints and used by
 * both the backend and the frontend AuthContext. Kept in shared types so the
 * frontend never needs to import from backend source paths.
 */
export interface AuthSession {
  token: string;
  user: User;
  expiresIn: number;
}

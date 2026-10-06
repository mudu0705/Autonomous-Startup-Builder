import jwt from 'jsonwebtoken';
import type { TokenManager } from './types.ts';
import type { AuthTokenPayload } from '../../../shared/types/user.ts';
import { env } from '../config/env.ts';
import { UnauthorizedError } from '../utils/errors.ts';

export class JwtTokenManager implements TokenManager {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(secret?: string, expiresIn = '7d') {
    this.secret = secret || env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production';
    this.expiresIn = expiresIn;
  }

  /**
   * Signs an authenticated user token containing minimum required identity payload.
   */
  sign(payload: AuthTokenPayload): string {
    const { userId, email, role } = payload;
    return jwt.sign(
      {
        userId,
        email,
        role,
      },
      this.secret,
      {
        expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
      }
    );
  }

  /**
   * Verifies an incoming JWT token and returns typed identity claims.
   * Throws UnauthorizedError if token is missing, expired, or invalid.
   */
  verify(token: string): AuthTokenPayload {
    if (!token) {
      throw new UnauthorizedError('Authentication token is required');
    }

    try {
      const decoded = jwt.verify(token, this.secret) as jwt.JwtPayload;
      if (!decoded || typeof decoded !== 'object' || !decoded.userId || !decoded.role) {
        throw new UnauthorizedError('Invalid token payload structure');
      }

      return {
        userId: decoded.userId as string,
        email: decoded.email as string,
        role: decoded.role as 'user' | 'admin',
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError) {
        throw err;
      }
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Authentication token has expired');
      }
      throw new UnauthorizedError('Invalid or corrupted authentication token');
    }
  }
}

export const jwtTokenManager = new JwtTokenManager();

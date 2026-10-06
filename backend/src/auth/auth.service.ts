import type { IAuthService } from './auth.interface.ts';
import type { AuthSession, PasswordHasher, TokenManager } from './types.ts';
import type { User } from '../../../shared/types/user.ts';
import type { UserLoginInput, UserRegistrationInput } from '../../../shared/schemas/index.ts';
import { UserRegistrationSchema, UserLoginSchema } from '../../../shared/schemas/index.ts';
import { UserModel, IUserDocument } from '../models/User.ts';
import { argon2Hasher } from './argon2.hasher.ts';
import { jwtTokenManager } from './jwt.manager.ts';
import { UnauthorizedError, ConflictError, ValidationError, NotFoundError } from '../utils/errors.ts';
import { logger } from '../config/logger.ts';

/**
 * Converts a raw Mongoose User document into a safe User representation,
 * explicitly guaranteeing passwordHash is never returned to the caller.
 */
export function toSafeUser(doc: IUserDocument): User {
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    email: doc.email,
    role: doc.role,
    status: doc.status,
    fullName: doc.fullName,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export class AuthService implements IAuthService {
  constructor(
    private readonly hasher: PasswordHasher = argon2Hasher,
    private readonly tokenManager: TokenManager = jwtTokenManager
  ) {}

  /**
   * Registers a new user with email normalization, Argon2 password hashing,
   * default 'user' role, and 'active' status. Returns a safe user object and JWT session token.
   */
  async register(input: UserRegistrationInput): Promise<AuthSession> {
    const parseResult = UserRegistrationSchema.safeParse(input);
    if (!parseResult.success) {
      throw new ValidationError('Invalid registration data', parseResult.error.format());
    }

    const normalizedEmail = parseResult.data.email.toLowerCase().trim();

    // Check for existing user with identical email
    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    // Hash password using Argon2
    const passwordHash = await this.hasher.hash(parseResult.data.password);

    // Persist new User document
    const userDoc = await UserModel.create({
      email: normalizedEmail,
      passwordHash,
      fullName: parseResult.data.fullName?.trim(),
      role: 'user',
      status: 'active',
    });

    const safeUser = toSafeUser(userDoc);
    const token = this.tokenManager.sign({
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    });

    logger.info('User registered successfully', { userId: safeUser.id, email: safeUser.email });

    return {
      token,
      user: safeUser,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    };
  }

  /**
   * Authenticates user login with normalized email, password verification via Argon2,
   * and active account check. Uses generic error message to prevent account enumeration.
   */
  async login(input: UserLoginInput): Promise<AuthSession> {
    const parseResult = UserLoginSchema.safeParse(input);
    if (!parseResult.success) {
      throw new ValidationError('Invalid login data', parseResult.error.format());
    }

    const normalizedEmail = parseResult.data.email.toLowerCase().trim();

    // Query user and explicitly select passwordHash (which is select: false by default)
    const userDoc = await UserModel.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!userDoc) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify user account status
    if (userDoc.status && userDoc.status !== 'active') {
      throw new UnauthorizedError('Account is disabled or inactive');
    }

    // Verify password hash
    const isPasswordValid = await this.hasher.verify(parseResult.data.password, userDoc.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const safeUser = toSafeUser(userDoc);
    const token = this.tokenManager.sign({
      userId: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    });

    logger.info('User logged in successfully', { userId: safeUser.id, email: safeUser.email });

    return {
      token,
      user: safeUser,
      expiresIn: 7 * 24 * 60 * 60,
    };
  }

  /**
   * Verifies an incoming session token, looks up the corresponding active user,
   * and returns an AuthSession or null if invalid or user inactive.
   */
  async verifySession(token: string): Promise<AuthSession | null> {
    try {
      const payload = this.tokenManager.verify(token);
      const userDoc = await UserModel.findById(payload.userId);
      if (!userDoc || userDoc.status !== 'active') {
        return null;
      }
      return {
        token,
        user: toSafeUser(userDoc),
        expiresIn: 7 * 24 * 60 * 60,
      };
    } catch {
      return null;
    }
  }

  /**
   * Resolves an authenticated user by ID, ensuring they exist and are active.
   */
  async getCurrentUser(userId: string): Promise<User> {
    const userDoc = await UserModel.findById(userId);
    if (!userDoc) {
      throw new NotFoundError('User not found');
    }
    if (userDoc.status !== 'active') {
      throw new UnauthorizedError('Account is disabled or inactive');
    }
    return toSafeUser(userDoc);
  }

  /**
   * Logout contract for stateless JWT tokens.
   */
  async logout(_token: string): Promise<void> {
    return Promise.resolve();
  }
}

export const authService = new AuthService();

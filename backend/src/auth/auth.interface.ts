import type { AuthSession } from './types.ts';
import type { User } from '../../../shared/types/user.ts';
import type { UserLoginInput, UserRegistrationInput } from '../../../shared/schemas/index.ts';

export interface IAuthService {
  register(input: UserRegistrationInput): Promise<AuthSession>;
  login(input: UserLoginInput): Promise<AuthSession>;
  verifySession(token: string): Promise<AuthSession | null>;
  getCurrentUser(userId: string): Promise<User>;
  logout(token: string): Promise<void>;
}

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.ts';
import { Argon2PasswordHasher } from '../src/auth/argon2.hasher.ts';
import { JwtTokenManager } from '../src/auth/jwt.manager.ts';
import { AuthService } from '../src/auth/auth.service.ts';
import { UserModel } from '../src/models/User.ts';
import { UnauthorizedError, ConflictError } from '../src/utils/errors.ts';

describe('Phase 2 Backend Authentication & Frontend Contract Test Suite', () => {
  let mongod: MongoMemoryServer;
  let hasher: Argon2PasswordHasher;
  let tokenManager: JwtTokenManager;
  let authService: AuthService;
  let app: FastifyInstance;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    hasher = new Argon2PasswordHasher();
    tokenManager = new JwtTokenManager('test-jwt-secret-key-12345', '1s'); // Short expiration for testing expired JWT
    const standardTokenManager = new JwtTokenManager('test-jwt-secret-key-12345', '1h');
    authService = new AuthService(hasher, standardTokenManager);

    app = await buildApp();
  });

  after(async () => {
    await app.close();
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  // ==========================================
  // PHASE 2.1 BACKEND CORE TESTS
  // ==========================================
  describe('Phase 2.1 - Core Auth Services', () => {
    test('password hashing works and generates Argon2id string', async () => {
      const password = 'SecurePassword123!';
      const hash = await hasher.hash(password);
      assert.ok(hash);
      assert.notEqual(hash, password);
      assert.ok(hash.startsWith('$argon2id$'));
    });

    test('password verification succeeds for correct password', async () => {
      const password = 'MySecretPassword99';
      const hash = await hasher.hash(password);
      const isValid = await hasher.verify(password, hash);
      assert.equal(isValid, true);
    });

    test('incorrect password fails verification', async () => {
      const password = 'MySecretPassword99';
      const hash = await hasher.hash(password);
      const isValid = await hasher.verify('WrongPassword', hash);
      assert.equal(isValid, false);
    });

    test('JWT generation works and produces valid JWT string', () => {
      const payload = { userId: 'user_123', email: 'test@example.com', role: 'user' as const };
      const token = tokenManager.sign(payload);
      assert.ok(token);
      assert.equal(typeof token, 'string');
    });

    test('JWT verification extracts user identity claims correctly', () => {
      const payload = { userId: 'user_456', email: 'alice@example.com', role: 'admin' as const };
      const token = tokenManager.sign(payload);
      const decoded = tokenManager.verify(token);

      assert.equal(decoded.userId, 'user_456');
      assert.equal(decoded.email, 'alice@example.com');
      assert.equal(decoded.role, 'admin');
    });

    test('expired/invalid JWT fails verification with UnauthorizedError', async () => {
      const payload = { userId: 'user_789', email: 'bob@example.com', role: 'user' as const };
      const token = tokenManager.sign(payload);

      // Wait 1.1s for short token to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      assert.throws(
        () => tokenManager.verify(token),
        (err: unknown) => err instanceof UnauthorizedError && err.message.includes('expired')
      );

      assert.throws(
        () => tokenManager.verify('invalid.jwt.token'),
        (err: unknown) => err instanceof UnauthorizedError
      );
    });

    test('registration creates a user with Argon2 password hash and returns safe user', async () => {
      const registrationInput = {
        email: 'founder@startup.io',
        password: 'Password123!',
        fullName: 'Jane Founder',
      };

      const session = await authService.register(registrationInput);
      assert.ok(session.token);
      assert.ok(session.user.id);
      assert.equal(session.user.email, 'founder@startup.io');
      assert.equal(session.user.fullName, 'Jane Founder');
      assert.equal(session.user.role, 'user');
      assert.equal(session.user.status, 'active');

      // Verify user document in DB has passwordHash stored securely
      const dbUser = await UserModel.findById(session.user.id).select('+passwordHash');
      assert.ok(dbUser);
      assert.ok(dbUser.passwordHash.startsWith('$argon2id$'));
      assert.notEqual(dbUser.passwordHash, 'Password123!');
    });

    test('duplicate email registration fails with ConflictError', async () => {
      const input = {
        email: 'duplicate@startup.io',
        password: 'Password123!',
      };

      await authService.register(input);

      await assert.rejects(
        async () => {
          await authService.register(input);
        },
        (err: unknown) => err instanceof ConflictError && err.message.includes('already exists')
      );
    });
  });

  // ==========================================
  // PHASE 2.2 API ROUTE & MIDDLEWARE TESTS
  // ==========================================
  describe('Phase 2.2 - Fastify Auth API Routes & Middleware', () => {
    test('POST /api/auth/register succeeds with valid payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Route User',
          email: 'routeuser@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        },
      });

      assert.equal(response.statusCode, 201);
      const body = JSON.parse(response.payload);
      assert.equal(body.success, true);
      assert.ok(body.data.token);
      assert.equal(body.data.user.email, 'routeuser@example.com');
      assert.equal(body.data.user.fullName, 'Route User');
      assert.equal(body.data.user.passwordHash, undefined);
    });

    test('POST /api/auth/register fails when confirmPassword does not match', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'mismatch@example.com',
          password: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
        },
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.payload);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
    });

    test('POST /api/auth/register fails on duplicate email', async () => {
      const payload = {
        email: 'same@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      };

      await app.inject({ method: 'POST', url: '/api/auth/register', payload });

      const secondRes = await app.inject({ method: 'POST', url: '/api/auth/register', payload });
      assert.equal(secondRes.statusCode, 409);
      const body = JSON.parse(secondRes.payload);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'CONFLICT');
    });

    test('POST /api/auth/login succeeds with valid credentials', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'loginapi@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'loginapi@example.com',
          password: 'Password123!',
        },
      });

      assert.equal(loginRes.statusCode, 200);
      const body = JSON.parse(loginRes.payload);
      assert.equal(body.success, true);
      assert.ok(body.data.token);
      assert.equal(body.data.user.email, 'loginapi@example.com');
      assert.equal(body.data.user.passwordHash, undefined);
    });

    test('POST /api/auth/login fails with HTTP 401 on invalid credentials', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'user1@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        },
      });

      const badPasswordRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'user1@example.com',
          password: 'WrongPassword!',
        },
      });

      assert.equal(badPasswordRes.statusCode, 401);
      const body = JSON.parse(badPasswordRes.payload);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });

    test('GET /api/auth/me succeeds with valid Bearer token', async () => {
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'meuser@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        },
      });
      const token = JSON.parse(regRes.payload).data.token;

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      assert.equal(meRes.statusCode, 200);
      const body = JSON.parse(meRes.payload);
      assert.equal(body.success, true);
      assert.equal(body.data.user.email, 'meuser@example.com');
      assert.equal(body.data.user.passwordHash, undefined);
    });

    test('GET /api/auth/me returns 401 when Authorization header is missing or malformed', async () => {
      const noHeaderRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });
      assert.equal(noHeaderRes.statusCode, 401);
    });

    test('POST /api/auth/logout succeeds and returns 200', async () => {
      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });
      assert.equal(logoutRes.statusCode, 200);
      const body = JSON.parse(logoutRes.payload);
      assert.equal(body.success, true);
    });
  });

  // ==========================================
  // PHASE 2.3 FRONTEND AUTH CONTRACT TESTS
  // ==========================================
  describe('Phase 2.3 - Frontend Session & Authorization Contracts', () => {
    test('Session restoration API contract matches AuthContext expectations', async () => {
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Session User',
          email: 'sessionrestored@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        },
      });

      const token = JSON.parse(regRes.payload).data.token;

      // Simulate AuthContext startup session restoration call GET /api/auth/me
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      assert.equal(meRes.statusCode, 200);
      const body = JSON.parse(meRes.payload);
      assert.equal(body.success, true);
      assert.ok(body.data.user.id);
      assert.equal(body.data.user.email, 'sessionrestored@example.com');
      assert.equal(body.data.user.role, 'user');
    });

    test('Invalid or expired token in session restoration fails safely with 401', async () => {
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer expired.or.invalid.token',
        },
      });

      assert.equal(meRes.statusCode, 401);
      const body = JSON.parse(meRes.payload);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });
  });
});

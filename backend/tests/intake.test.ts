import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.ts';
import { AuthService } from '../src/auth/auth.service.ts';
import { argon2Hasher } from '../src/auth/argon2.hasher.ts';
import { JwtTokenManager } from '../src/auth/jwt.manager.ts';
import { ProjectModel } from '../src/models/Project.ts';
import { UserModel } from '../src/models/User.ts';
import { ConversationModel } from '../src/models/Conversation.ts';
import {
  normalizeIndianBudget,
  normalizeIndianLocation,
  normalizeAnalysisDepth,
  ruleBasedExtraction,
} from '../src/services/intake.extractor.ts';

describe('Phase 2.4B Smart Guided Intake Test Suite', () => {
  let mongod: MongoMemoryServer;
  let app: FastifyInstance;
  let tokenManager: JwtTokenManager;
  let authService: AuthService;

  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let project1Id: string;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    tokenManager = new JwtTokenManager('test-jwt-secret-key-12345', '1h');
    authService = new AuthService(argon2Hasher, tokenManager);

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
    await ConversationModel.deleteMany({});
    await ProjectModel.deleteMany({});
    await UserModel.deleteMany({});

    // Register User 1
    const u1 = await authService.register({
      email: 'founder1@example.com',
      password: 'Password123!',
      fullName: 'Founder One',
    });
    user1Token = u1.token;
    user1Id = u1.user.id;

    // Register User 2
    const u2 = await authService.register({
      email: 'founder2@example.com',
      password: 'Password123!',
      fullName: 'Founder Two',
    });
    user2Token = u2.token;
    user2Id = u2.user.id;

    // Create Initial Project for User 1
    const p1 = await ProjectModel.create({
      userId: new mongoose.Types.ObjectId(user1Id),
      name: 'Initial Project',
      startupIdea: 'AI educational tooling',
      analysisDepth: 'standard',
      status: 'DRAFT',
    });
    project1Id = p1._id.toString();
  });

  // 1. Budget Normalization Tests
  describe('1. Indian Budget Normalization Logic', () => {
    test('normalizes lakh amounts (e.g. ₹5 lakh -> 500000)', () => {
      const res = normalizeIndianBudget('I have around ₹5 lakh to start');
      assert.ok(res);
      assert.equal(res.amount, 500000);
      assert.equal(res.currency, 'INR');
      assert.equal(res.source, 'user_provided');
    });

    test('normalizes ranges (e.g. ₹3-5 lakh -> min 300000, max 500000)', () => {
      const res = normalizeIndianBudget('Our budget is ₹3–5 lakh');
      assert.ok(res);
      assert.equal(res.minAmount, 300000);
      assert.equal(res.maxAmount, 500000);
      assert.equal(res.amount, 400000);
      assert.equal(res.source, 'user_provided');
    });

    test('normalizes crore amounts (e.g. 1.5 crore -> 15000000)', () => {
      const res = normalizeIndianBudget('We are backed with 1.5 crore');
      assert.ok(res);
      assert.equal(res.amount, 15000000);
      assert.equal(res.currency, 'INR');
    });

    test('normalizes uncertain answers as ai_estimated without blocking', () => {
      const res = normalizeIndianBudget("I don't know my exact budget yet, I'm not sure");
      assert.ok(res);
      assert.equal(res.amount, null);
      assert.equal(res.source, 'ai_estimated');
    });
  });

  // 2. India Location Normalization Tests
  describe('2. India Location Normalization Logic', () => {
    test('normalizes national scope for All India', () => {
      const res = normalizeIndianLocation('We are launching All India nationwide');
      assert.ok(res);
      assert.equal(res.country, 'India');
      assert.equal(res.scope, 'national');
      assert.deepEqual(res.locations, ['All India']);
    });

    test('normalizes specific state (e.g. Maharashtra)', () => {
      const res = normalizeIndianLocation('We will start in Maharashtra');
      assert.ok(res);
      assert.equal(res.country, 'India');
      assert.equal(res.scope, 'state');
      assert.deepEqual(res.locations, ['Maharashtra']);
    });

    test('normalizes specific city (e.g. Pune)', () => {
      const res = normalizeIndianLocation('Launching first in Pune');
      assert.ok(res);
      assert.equal(res.country, 'India');
      assert.equal(res.scope, 'city');
      assert.ok(res.locations[0].includes('Pune'));
    });

    test('normalizes multiple cities as region', () => {
      const res = normalizeIndianLocation('Launching across Bengaluru and Pune');
      assert.ok(res);
      assert.equal(res.country, 'India');
      assert.equal(res.scope, 'region');
      assert.equal(res.locations.length, 2);
    });
  });

  // 3. Multi-Field Extraction in a Single Response
  describe('3. Multi-Field Extraction from a Single Natural Language Message', () => {
    test('extracts idea, target customers, location, and budget in one pass', () => {
      const message =
        'I want to build an AI study planner for engineering students in Maharashtra. I have around 5 lakh rupees.';
      const res = ruleBasedExtraction(message, 'startupIdea', {
        startupIdea: null,
        proposedSolution: null,
        startupName: null,
        targetCustomers: null,
        location: { country: 'India', scope: null, locations: [] },
        budget: { amount: null, minAmount: null, maxAmount: null, currency: 'INR', source: null, confidence: null },
        revenueModel: null,
        additionalInformation: null,
        analysisDepth: null,
      });

      assert.ok(res.extracted.startupIdea);
      assert.ok(res.extracted.targetCustomers);
      assert.ok(res.extracted.location);
      assert.equal(res.extracted.location.scope, 'state');
      assert.deepEqual(res.extracted.location.locations, ['Maharashtra']);
      assert.ok(res.extracted.budget);
      assert.equal(res.extracted.budget.amount, 500000);
      assert.equal(res.extracted.budget.source, 'user_provided');
    });
  });

  // 4. Guided Intake API & Conversation Manager Tests
  describe('4. Conversation Endpoints & State Machine Flow', () => {
    test('GET /api/projects/:id/conversation initializes and returns first question', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${project1Id}/conversation`,
        headers: { authorization: `Bearer ${user1Token}` },
      });

      assert.equal(response.statusCode, 200);
      const body = JSON.parse(response.payload);
      assert.equal(body.success, true);
      assert.ok(body.data.nextQuestion);
      assert.equal(body.data.progress.total, 9);
      assert.equal(body.data.progress.totalRequired, 6);
    });

    test('POST /api/projects/:id/conversation/message extracts fields and advances question', async () => {
      // User provides multi-field answer
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project1Id}/conversation/message`,
        headers: { authorization: `Bearer ${user1Token}` },
        payload: {
          message:
            'I want to build an AI study planner for engineering students in Maharashtra. I have around 5 lakh rupees.',
        },
      });

      assert.equal(response.statusCode, 200);
      const body = JSON.parse(response.payload);
      assert.equal(body.success, true);
      assert.ok(body.data.state.startupIdea);
      assert.equal(body.data.state.location.scope, 'state');
      assert.equal(body.data.state.budget.amount, 500000);

      // The next question must NOT ask for location or budget again!
      assert.notEqual(body.data.currentCategory, 'location');
      assert.notEqual(body.data.currentCategory, 'budget');
      assert.ok(body.data.progress.completed >= 3);
    });

    test('User corrections update structured state correctly', async () => {
      // Step 1: Initial answer with Pune
      await app.inject({
        method: 'POST',
        url: `/api/projects/${project1Id}/conversation/message`,
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { message: 'We are launching in Pune.' },
      });

      // Step 2: User explicitly changes location to All India
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project1Id}/conversation/message`,
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { message: 'Actually, we decided to launch All India nationwide.' },
      });

      const body = JSON.parse(response.payload);
      assert.equal(body.data.state.location.scope, 'national');
      assert.deepEqual(body.data.state.location.locations, ['All India']);
    });

    test('All 6 required categories trigger readyForAnalysis = true', async () => {
      // Complete required fields
      await app.inject({
        method: 'POST',
        url: `/api/projects/${project1Id}/conversation/message`,
        headers: { authorization: `Bearer ${user1Token}` },
        payload: {
          message:
            'Our startup idea is an automated GST billing platform for small merchants. The proposed solution is a WhatsApp chatbot invoice generator. Our target customers are grocery merchants in Delhi NCR with ₹5 lakh budget and standard analysis depth.',
        },
      });

      const convRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${project1Id}/conversation`,
        headers: { authorization: `Bearer ${user1Token}` },
      });

      const convBody = JSON.parse(convRes.payload);
      assert.equal(convBody.data.readyForAnalysis, true);
      assert.equal(convBody.data.progress.requiredCompleted, 6);
    });

    test('POST /api/projects/:id/conversation/confirm marks project as READY_FOR_ANALYSIS', async () => {
      // Complete required fields
      await app.inject({
        method: 'POST',
        url: `/api/projects/${project1Id}/conversation/message`,
        headers: { authorization: `Bearer ${user1Token}` },
        payload: {
          message:
            'Our startup idea is an automated GST billing platform. The proposed solution is a mobile invoice app for small merchants in Delhi with ₹3 lakh budget and standard analysis depth.',
        },
      });

      const confirmRes = await app.inject({
        method: 'POST',
        url: `/api/projects/${project1Id}/conversation/confirm`,
        headers: { authorization: `Bearer ${user1Token}` },
      });

      assert.equal(confirmRes.statusCode, 200);
      const confirmBody = JSON.parse(confirmRes.payload);
      assert.equal(confirmBody.data.status, 'READY_FOR_ANALYSIS');

      // Verify DB document
      const dbProject = await ProjectModel.findById(project1Id);
      assert.ok(dbProject);
      assert.equal(dbProject.status, 'READY_FOR_ANALYSIS');
    });

    test('POST /api/projects/:id/conversation/reset resets answers without deleting project', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/projects/${project1Id}/conversation/message`,
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { message: 'Some startup details' },
      });

      const resetRes = await app.inject({
        method: 'POST',
        url: `/api/projects/${project1Id}/conversation/reset`,
        headers: { authorization: `Bearer ${user1Token}` },
      });

      assert.equal(resetRes.statusCode, 200);
      const resetBody = JSON.parse(resetRes.payload);
      assert.equal(resetBody.data.progress.percentage, 0);

      // Verify project still exists in DB
      const dbProject = await ProjectModel.findById(project1Id);
      assert.ok(dbProject);
      assert.equal(dbProject.status, 'DRAFT');
    });
  });

  // 5. Ownership Security Tests
  describe('5. Ownership Security on Intake Endpoints', () => {
    test('User 2 cannot read User 1 intake conversation (returns 404)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${project1Id}/conversation`,
        headers: { authorization: `Bearer ${user2Token}` },
      });

      assert.equal(response.statusCode, 404);
    });

    test('User 2 cannot send messages to User 1 conversation (returns 404)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project1Id}/conversation/message`,
        headers: { authorization: `Bearer ${user2Token}` },
        payload: { message: 'Malicious attempt' },
      });

      assert.equal(response.statusCode, 404);
    });

    test('Unauthenticated user is rejected with 401', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/projects/${project1Id}/conversation`,
      });

      assert.equal(response.statusCode, 401);
    });

    test('Empty message is rejected with 400 validation error', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${project1Id}/conversation/message`,
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { message: '   ' },
      });

      assert.equal(response.statusCode, 400);
    });
  });
});

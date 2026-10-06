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

describe('Phase 2.4A Project Persistence, CRUD & Ownership Security Tests', () => {
  let mongod: MongoMemoryServer;
  let app: FastifyInstance;
  let tokenManager: JwtTokenManager;
  let authService: AuthService;

  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;

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
    await ProjectModel.deleteMany({});
    await UserModel.deleteMany({});

    // Register User 1
    const u1Session = await authService.register({
      email: 'user1@example.com',
      password: 'Password123!',
      fullName: 'User One',
    });
    user1Token = u1Session.token;
    user1Id = u1Session.user.id;

    // Register User 2
    const u2Session = await authService.register({
      email: 'user2@example.com',
      password: 'Password123!',
      fullName: 'User Two',
    });
    user2Token = u2Session.token;
    user2Id = u2Session.user.id;
  });

  describe('1. Project Creation (POST /api/projects)', () => {
    test('authenticated user can create a project and userId is derived from auth context', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
        payload: {
          name: 'India FinTech Portal',
          startupIdea: 'AI-driven micro-lending portal for tier-2/3 Indian cities',
          analysisDepth: 'standard',
        },
      });

      assert.equal(response.statusCode, 201);
      const body = JSON.parse(response.payload);
      assert.equal(body.success, true);
      assert.ok(body.data.id);
      assert.equal(body.data.userId, user1Id);
      assert.equal(body.data.name, 'India FinTech Portal');
      assert.equal(body.data.status, 'DRAFT');
      assert.equal(body.data.location.country, 'India');
      assert.equal(body.data.budget.currency, 'INR');

      // Verify DB document
      const dbProject = await ProjectModel.findById(body.data.id);
      assert.ok(dbProject);
      assert.equal(dbProject.userId.toString(), user1Id);
    });

    test('unauthenticated creation request is rejected with 401', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        payload: {
          name: 'Unauth Project',
          startupIdea: 'Valid startup idea description here',
        },
      });

      assert.equal(response.statusCode, 401);
    });

    test('invalid project payload is rejected with 400 validation error', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
        payload: {
          name: 'X', // Too short
          startupIdea: 'Short', // Too short
        },
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.payload);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('2. Project Listing (GET /api/projects)', () => {
    test('user receives only their own projects and never another user projects', async () => {
      // Create 2 projects for User 1
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'User 1 Project A', startupIdea: 'Startup idea A description' },
      });

      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'User 1 Project B', startupIdea: 'Startup idea B description' },
      });

      // Create 1 project for User 2
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user2Token}` },
        payload: { name: 'User 2 Project C', startupIdea: 'Startup idea C description' },
      });

      // Fetch User 1 projects
      const res1 = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
      });

      assert.equal(res1.statusCode, 200);
      const body1 = JSON.parse(res1.payload);
      assert.equal(body1.data.count, 2);
      assert.equal(body1.data.projects[0].userId, user1Id);
      assert.equal(body1.data.projects[1].userId, user1Id);

      // Fetch User 2 projects
      const res2 = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user2Token}` },
      });

      assert.equal(res2.statusCode, 200);
      const body2 = JSON.parse(res2.payload);
      assert.equal(body2.data.count, 1);
      assert.equal(body2.data.projects[0].name, 'User 2 Project C');
      assert.equal(body2.data.projects[0].userId, user2Id);
    });

    test('empty project list returns count 0', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.data.count, 0);
      assert.deepEqual(body.data.projects, []);
    });
  });

  describe('3. Single Project Retrieval (GET /api/projects/:id)', () => {
    test('owner can retrieve their project by ID', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'My Unique Project', startupIdea: 'Unique startup idea description' },
      });

      const projectId = JSON.parse(createRes.payload).data.id;

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${user1Token}` },
      });

      assert.equal(getRes.statusCode, 200);
      const body = JSON.parse(getRes.payload);
      assert.equal(body.data.name, 'My Unique Project');
    });

    test('another user cannot retrieve someone elses project (returns 404)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'User 1 Private Project', startupIdea: 'Private idea description' },
      });

      const projectId = JSON.parse(createRes.payload).data.id;

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${user2Token}` }, // User 2 trying to read User 1's project
      });

      assert.equal(getRes.statusCode, 404);
      const body = JSON.parse(getRes.payload);
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'NOT_FOUND');
    });
  });

  describe('4. Project Update (PATCH /api/projects/:id)', () => {
    test('owner can update allowed project fields', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'Initial Name', startupIdea: 'Initial idea description' },
      });

      const projectId = JSON.parse(createRes.payload).data.id;

      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${user1Token}` },
        payload: {
          name: 'Updated Name',
          status: 'INTAKE_IN_PROGRESS',
        },
      });

      assert.equal(patchRes.statusCode, 200);
      const body = JSON.parse(patchRes.payload);
      assert.equal(body.data.name, 'Updated Name');
      assert.equal(body.data.status, 'INTAKE_IN_PROGRESS');
    });

    test('another user cannot update someone elses project (returns 404)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'Protected Project', startupIdea: 'Protected idea description' },
      });

      const projectId = JSON.parse(createRes.payload).data.id;

      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${user2Token}` },
        payload: { name: 'Hacked Name' },
      });

      assert.equal(patchRes.statusCode, 404);
    });
  });

  describe('5. Project Deletion (DELETE /api/projects/:id)', () => {
    test('owner can delete their project', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'Project to Delete', startupIdea: 'Idea description to delete' },
      });

      const projectId = JSON.parse(createRes.payload).data.id;

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${user1Token}` },
      });

      assert.equal(deleteRes.statusCode, 200);

      // Verify project is removed from database
      const dbProject = await ProjectModel.findById(projectId);
      assert.equal(dbProject, null);
    });

    test('another user cannot delete someone elses project (returns 404)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'Safe Project', startupIdea: 'Safe idea description' },
      });

      const projectId = JSON.parse(createRes.payload).data.id;

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${user2Token}` },
      });

      assert.equal(deleteRes.statusCode, 404);

      // Verify project still exists in DB
      const dbProject = await ProjectModel.findById(projectId);
      assert.ok(dbProject);
    });
  });

  describe('6. Admin Authorization Capability', () => {
    let adminToken: string;

    beforeEach(async () => {
      const admin = await UserModel.create({
        email: 'admin@example.com',
        passwordHash: 'hashed_admin_password',
        fullName: 'Admin User',
        role: 'admin',
        status: 'active',
      });

      adminToken = tokenManager.sign({
        userId: admin._id.toString(),
        email: admin.email,
        role: 'admin',
      });
    });

    test('admin can retrieve any user project by ID', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'User 1 Project For Admin', startupIdea: 'Project idea for admin inspection' },
      });

      const projectId = JSON.parse(createRes.payload).data.id;

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      assert.equal(getRes.statusCode, 200);
      const body = JSON.parse(getRes.payload);
      assert.equal(body.data.name, 'User 1 Project For Admin');
    });

    test('admin can list all projects across all users using ?all=true', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'Project 1', startupIdea: 'Startup idea 1 description' },
      });

      await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user2Token}` },
        payload: { name: 'Project 2', startupIdea: 'Startup idea 2 description' },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/projects?all=true',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      assert.equal(listRes.statusCode, 200);
      const body = JSON.parse(listRes.payload);
      assert.equal(body.data.count, 2);
    });

    test('admin can delete any project', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${user1Token}` },
        payload: { name: 'To Be Admin Deleted', startupIdea: 'Idea to be admin deleted' },
      });

      const projectId = JSON.parse(createRes.payload).data.id;

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/projects/${projectId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      assert.equal(deleteRes.statusCode, 200);
      const dbProject = await ProjectModel.findById(projectId);
      assert.equal(dbProject, null);
    });
  });
});


import mongoose from 'mongoose';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';
import type { DatabaseStatus } from '../../../shared/types/health.ts';

// Fail fast on disconnected database operations instead of hanging indefinitely
mongoose.set('bufferCommands', false);

class DatabaseService {
  private status: DatabaseStatus = 'disconnected';
  private lastErrorMessage: string | null = null;
  private isConnecting = false;
  private mongoMemoryServer: any = null;

  public async connect(): Promise<boolean> {
    let uri = env.MONGODB_URI?.trim();

    if (!uri) {
      try {
        logger.info('Database service: No MONGODB_URI provided. Initializing in-memory MongoDB instance for preview...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        this.mongoMemoryServer = await MongoMemoryServer.create();
        uri = this.mongoMemoryServer.getUri();
        logger.info('Database service: In-memory MongoDB instance started successfully.');
      } catch (memErr) {
        this.status = 'disconnected';
        this.lastErrorMessage = 'MONGODB_URI is not configured in environment variables.';
        logger.warn('Database service: MongoDB URI not provided and in-memory server could not start. Running in disconnected mode.', {
          instruction: 'To enable persistence, define MONGODB_URI in your environment configuration.',
          error: memErr instanceof Error ? memErr.message : String(memErr),
        });
        return false;
      }
    }

    if (this.isConnecting) {
      return false;
    }

    try {
      this.isConnecting = true;
      this.status = 'connecting';
      logger.info('Database service: Attempting connection to MongoDB...');

      // Configure mongoose connection options
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      this.status = 'connected';
      this.lastErrorMessage = null;
      this.isConnecting = false;

      logger.info('Database service: Successfully established connection to MongoDB.');

      mongoose.connection.on('disconnected', () => {
        this.status = 'disconnected';
        logger.warn('Database service: MongoDB disconnected.');
      });

      mongoose.connection.on('error', (err) => {
        this.status = 'error';
        this.lastErrorMessage = err?.message || 'Unknown database error occurred';
        logger.error('Database service: MongoDB connection error.', { error: this.lastErrorMessage });
      });

      return true;
    } catch (err: unknown) {
      this.status = 'disconnected';
      this.isConnecting = false;
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to MongoDB';
      this.lastErrorMessage = errorMsg;

      logger.warn('Database service: Unable to connect to MongoDB.', {
        reason: errorMsg,
        guidance: 'Verify that MONGODB_URI points to an active and reachable MongoDB instance.',
      });
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.mongoMemoryServer) {
      try {
        await this.mongoMemoryServer.stop();
      } catch {
        // ignore
      }
      this.mongoMemoryServer = null;
    }

    if (this.status === 'connected') {
      try {
        await mongoose.disconnect();
        this.status = 'disconnected';
        logger.info('Database service: Disconnected from MongoDB cleanly.');
      } catch (err: unknown) {
        logger.error('Database service: Error during MongoDB disconnection.', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  public getStatus(): DatabaseStatus {
    const readyState = mongoose.connection.readyState;
    switch (readyState) {
      case 1:
        return 'connected';
      case 2:
        return 'connecting';
      default:
        return 'disconnected';
    }
  }

  public getDiagnostics(): { status: DatabaseStatus; message: string } {
    const status = this.getStatus();
    let message = 'MongoDB is ready and connected.';
    if (status === 'disconnected') {
      message = this.lastErrorMessage || 'MongoDB is not connected. Configure MONGODB_URI in .env.';
    } else if (status === 'connecting') {
      message = 'MongoDB connection in progress...';
    }
    return { status, message };
  }
}

export const databaseService = new DatabaseService();

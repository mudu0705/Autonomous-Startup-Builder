import mongoose from 'mongoose';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';
import type { DatabaseStatus } from '../../../shared/types/health.ts';

// Fail fast on disconnected database operations instead of hanging indefinitely
mongoose.set('bufferCommands', false);

class DatabaseService {
  private status: DatabaseStatus = 'disconnected';
  private lastErrorMessage: string | null = null;
  private connectPromise: Promise<boolean> | null = null;
  private mongoMemoryServer: any = null;
  private usingInMemoryFallback = false;

  private attachListeners(): void {
    mongoose.connection.removeAllListeners('disconnected');
    mongoose.connection.removeAllListeners('error');

    mongoose.connection.on('disconnected', () => {
      this.status = 'disconnected';
      logger.warn('Database service: MongoDB disconnected.');
    });

    mongoose.connection.on('error', (err) => {
      this.status = 'error';
      this.lastErrorMessage = err?.message || 'Unknown database error occurred';
      logger.error('Database service: MongoDB connection error.', { error: this.lastErrorMessage });
    });
  }

  private async connectToMemoryServer(fallbackReason?: string): Promise<boolean> {
    try {
      logger.info(
        fallbackReason
          ? `Database service: External MongoDB unreachable (${fallbackReason}). Falling back to in-memory MongoDB instance...`
          : 'Database service: No MONGODB_URI provided. Initializing in-memory MongoDB instance...'
      );
      try {
        await mongoose.disconnect();
      } catch {
        // ignore any prior partial connection state
      }

      const { MongoMemoryServer } = await import('mongodb-memory-server');
      if (!this.mongoMemoryServer) {
        this.mongoMemoryServer = await MongoMemoryServer.create();
      }
      const memUri = this.mongoMemoryServer.getUri();

      await mongoose.connect(memUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      this.status = 'connected';
      this.usingInMemoryFallback = true;
      this.lastErrorMessage = null;
      this.attachListeners();
      logger.info('Database service: In-memory MongoDB instance connected and ready.');
      return true;
    } catch (memErr: unknown) {
      this.status = 'disconnected';
      const errorMsg = memErr instanceof Error ? memErr.message : String(memErr);
      this.lastErrorMessage = errorMsg;
      logger.warn('Database service: In-memory MongoDB server could not start. Running in disconnected mode.', {
        error: errorMsg,
      });
      return false;
    }
  }

  public async ensureConnected(): Promise<boolean> {
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    return this.connect();
  }

  public async connect(): Promise<boolean> {
    if (mongoose.connection.readyState === 1) {
      this.status = 'connected';
      return true;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.performConnect().finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  private async performConnect(): Promise<boolean> {
    const uri = env.MONGODB_URI?.trim();

    if (!uri) {
      return this.connectToMemoryServer();
    }

    try {
      this.status = 'connecting';
      logger.info('Database service: Attempting connection to configured MONGODB_URI...');

      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      });

      this.status = 'connected';
      this.usingInMemoryFallback = false;
      this.lastErrorMessage = null;
      this.attachListeners();

      logger.info('Database service: Successfully established connection to configured MongoDB.');
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to MongoDB';
      logger.warn('Database service: Unable to connect to external MONGODB_URI. Falling back to in-memory database.', {
        reason: errorMsg,
      });
      return this.connectToMemoryServer(errorMsg);
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

    if (mongoose.connection.readyState !== 0) {
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
    let message = this.usingInMemoryFallback
      ? 'MongoDB is ready and connected (in-memory instance).'
      : 'MongoDB is ready and connected.';
    if (status === 'disconnected') {
      message = this.lastErrorMessage || 'MongoDB is not connected. Configure MONGODB_URI in .env.';
    } else if (status === 'connecting') {
      message = 'MongoDB connection in progress...';
    }
    return { status, message };
  }
}

export const databaseService = new DatabaseService();

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().optional().default(''),
  JWT_SECRET: z.string().default('dev-jwt-secret-do-not-use-in-production'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  GOOGLE_SEARCH_API_KEY: z.string().optional().default(''),
  GOOGLE_SEARCH_CX: z.string().optional().default(''),
  APP_URL: z.string().optional().default(''),
  OLLAMA_BASE_URL: z.string().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5-coder:7b'),
  OLLAMA_TIMEOUT_MS: z.string().default('120000').transform((val) => parseInt(val, 10)),
  AI_PROVIDER: z.enum(['ollama', 'gemini', 'auto']).default('auto'),
  GITHUB_TOKEN: z.string().optional().default(''),
  TAVILY_API_KEY: z.string().optional().default(''),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables configuration:', parsedEnv.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsedEnv.data;

export type Environment = typeof env;

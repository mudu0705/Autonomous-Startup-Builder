export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'jwt_secret',
  'jwtsecret',
  'secret',
  'authorization',
  'gemini_api_key',
  'apikey',
  'mongodb_uri',
  'credentials',
]);

/**
 * Recursively redacts sensitive keys from log contexts
 */
function redact(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redact);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redact(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

class StructuredLogger {
  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level,
      message,
      ...(context ? { context: redact(context) } : {}),
    };
    return JSON.stringify(payload);
  }

  public info(message: string, context?: LogContext): void {
    // eslint-disable-next-line no-console
    console.log(this.formatLog('info', message, context));
  }

  public warn(message: string, context?: LogContext): void {
    // eslint-disable-next-line no-console
    console.warn(this.formatLog('warn', message, context));
  }

  public error(message: string, context?: LogContext): void {
    // eslint-disable-next-line no-console
    console.error(this.formatLog('error', message, context));
  }

  public debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(this.formatLog('debug', message, context));
    }
  }
}

export const logger = new StructuredLogger();

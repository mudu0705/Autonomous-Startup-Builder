import type { User } from '../../shared/types/user.ts';
import type { AuthSession } from '../../shared/types/auth.ts';
import type { UserLoginInput, UserRegistrationRouteInput } from '../../shared/schemas/index.ts';


const TOKEN_KEY = 'autonomous_startup_builder_token';

export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage unavailable or disabled
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage unavailable
    }
  },
};

interface ApiResponseSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

interface ApiResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body !== undefined && options.body !== '') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  } else {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message: 'Failed to communicate with authentication server.',
    },
    timestamp: new Date().toISOString(),
  }));

  if (!json.success) {
    throw new Error(json.error.message || 'An unexpected authentication error occurred.');
  }

  return json.data;
}

export const api = {
  get: async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = tokenStorage.get();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(endpoint, {
      ...options,
      method: 'GET',
      headers,
    });
    const json = await response.json();
    if (json && typeof json === 'object' && 'success' in json) {
      if (!json.success) {
        throw new Error(json.error?.message || 'Request failed');
      }
      return json.data as T;
    }
    return json as T;
  },
  post: async <T>(endpoint: string, body?: unknown, options: RequestInit = {}): Promise<T> => {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  },
};

export const authApi = {
  register: async (input: UserRegistrationRouteInput): Promise<AuthSession> => {
    const data = await request<AuthSession>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (data.token) {
      tokenStorage.set(data.token);
    }
    return data;
  },

  login: async (input: UserLoginInput): Promise<AuthSession> => {
    const data = await request<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (data.token) {
      tokenStorage.set(data.token);
    }
    return data;
  },

  getMe: async (): Promise<{ user: User }> => {
    return await request<{ user: User }>('/api/auth/me', {
      method: 'GET',
    });
  },

  logout: async (): Promise<void> => {
    try {
      await request<{ message: string }>('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      tokenStorage.clear();
    }
  },
};

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  env: string;
  port: number;
  apiVersion: string;
  demoMode: {
    enabled: boolean;
    autoEnableOnFailure: boolean;
    maxRetries: number;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    pool: {
      min: number;
      max: number;
    };
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  security: {
    jwtSecret: string;
    jwtAccessTokenExpiry: string;
    jwtRefreshTokenExpiry: string;
    jwtIssuer: string;
    jwtAudience: string;
    encryptionKey: string;
    bcryptRounds: number;
  };
  email: {
    provider: string;
    apiKey: string;
    from: string;
  };
  teams: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    webhookSecret: string;
  };
  logging: {
    level: string;
  };
  ai: {
    azureDocumentIntelligence: {
      endpoint: string;
      key: string;
      timeout: number;
    };
    llm: {
      provider: 'openai' | 'claude';
      openai: {
        apiKey: string;
        model: string;
        maxTokens: number;
        temperature: number;
        timeout: number;
      };
      claude: {
        apiKey: string;
        model: string;
        maxTokens: number;
      };
    };
    confidenceThreshold: number;
    maxRetries: number;
    retryDelay: number;
  };
}

// Helper to safely parse boolean env vars
const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

// Helper to safely parse integers with fallback
const safeParseInt = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Helper to safely parse floats with fallback
const safeParseFloat = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: safeParseInt(process.env.PORT, 3000),
  apiVersion: process.env.API_VERSION || 'v1',
  demoMode: {
    enabled: parseBoolean(process.env.DEMO_MODE, false),
    autoEnableOnFailure: parseBoolean(process.env.DEMO_MODE_AUTO_ENABLE, true),
    maxRetries: safeParseInt(process.env.DEMO_MODE_MAX_RETRIES, 3),
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: safeParseInt(process.env.DB_PORT, 5432),
    name: process.env.DB_NAME || 'lending_crm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    pool: {
      min: safeParseInt(process.env.DB_POOL_MIN, 2),
      max: safeParseInt(process.env.DB_POOL_MAX, 10),
    },
  },
  redis: {
    // If a single REDIS_URL is provided (as Railway does), parse and prefer its components.
    // Format: redis://[:user@]password@host:port[/db] or rediss:// for TLS
    host: (() => {
      try {
        if (process.env.REDIS_URL) return new URL(process.env.REDIS_URL).hostname;
      } catch (_) {}
      return process.env.REDIS_HOST || 'localhost';
    })(),
    port: (() => {
      try {
        if (process.env.REDIS_URL) return safeParseInt(new URL(process.env.REDIS_URL).port, 6379);
      } catch (_) {}
      return safeParseInt(process.env.REDIS_PORT, 6379);
    })(),
    password: (() => {
      try {
        if (process.env.REDIS_URL) {
          const p = new URL(process.env.REDIS_URL).password;
          return p ? decodeURIComponent(p) : undefined;
        }
      } catch (_) {}
      return process.env.REDIS_PASSWORD || undefined;
    })(),
    db: (() => {
      try {
        if (process.env.REDIS_URL) {
          const path = new URL(process.env.REDIS_URL).pathname || '';
          if (path && path.length > 1) return safeParseInt(path.slice(1), 0);
        }
      } catch (_) {}
      return safeParseInt(process.env.REDIS_DB, 0);
    })(),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtAccessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    jwtRefreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    jwtIssuer: process.env.JWT_ISSUER || 'government-lending-crm',
    jwtAudience: process.env.JWT_AUDIENCE || 'government-lending-crm-api',
    encryptionKey: process.env.ENCRYPTION_KEY || 'dev-encryption-key-change-in-production',
    bcryptRounds: safeParseInt(process.env.BCRYPT_ROUNDS, 12),
  },
  email: {
    provider: process.env.EMAIL_SERVICE_PROVIDER || 'sendgrid',
    apiKey: process.env.EMAIL_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@example.com',
  },
  teams: {
    clientId: process.env.TEAMS_CLIENT_ID || '',
    clientSecret: process.env.TEAMS_CLIENT_SECRET || '',
    tenantId: process.env.TEAMS_TENANT_ID || '',
    webhookSecret: process.env.TEAMS_WEBHOOK_SECRET || 'dev-webhook-secret-change-in-production',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  ai: {
    azureDocumentIntelligence: {
      endpoint: process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '',
      key: process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || '',
      timeout: safeParseInt(process.env.AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT, 30000),
    },
    llm: {
      provider: (process.env.LLM_PROVIDER as 'openai' | 'claude') || 'openai',
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        maxTokens: safeParseInt(process.env.OPENAI_MAX_TOKENS, 2000),
        temperature: safeParseFloat(process.env.OPENAI_TEMPERATURE, 0.7),
        timeout: safeParseInt(process.env.OPENAI_TIMEOUT, 30000),
      },
      claude: {
        apiKey: process.env.CLAUDE_API_KEY || '',
        model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
        maxTokens: safeParseInt(process.env.CLAUDE_MAX_TOKENS, 2000),
      },
    },
    confidenceThreshold: safeParseFloat(process.env.AI_CONFIDENCE_THRESHOLD, 0.85),
    maxRetries: safeParseInt(process.env.AI_MAX_RETRIES, 3),
    retryDelay: safeParseInt(process.env.AI_RETRY_DELAY, 1000),
  },
};

export default config;

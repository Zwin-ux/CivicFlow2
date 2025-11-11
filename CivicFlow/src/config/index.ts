import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  env: string;
  port: number;
  apiVersion: string;
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
    encryptionKey: string;
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

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'lending_crm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    encryptionKey: process.env.ENCRYPTION_KEY || 'dev-encryption-key-change-in-production',
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
      timeout: parseInt(process.env.AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT || '30000', 10),
    },
    llm: {
      provider: (process.env.LLM_PROVIDER as 'openai' | 'claude') || 'openai',
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000', 10),
      },
      claude: {
        apiKey: process.env.CLAUDE_API_KEY || '',
        model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
        maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '2000', 10),
      },
    },
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.85'),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.AI_RETRY_DELAY || '1000', 10),
  },
};

export default config;

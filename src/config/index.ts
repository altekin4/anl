import dotenv from 'dotenv';
import { DatabaseConfig, RedisConfig, OpenAIConfig, EOSConfig } from '@/types';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'tercih_sihirbazi',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  } as DatabaseConfig,
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  } as RedisConfig,
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-3.5-turbo',
    maxTokens: 1000,
    temperature: 0.7,
  } as OpenAIConfig,
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '20', 10),
  },
  
  eos: {
    apiBaseUrl: process.env.EOS_API_BASE_URL || 'http://localhost:8000',
    apiKey: process.env.EOS_API_KEY || '',
  } as EOSConfig,
};

export default config;
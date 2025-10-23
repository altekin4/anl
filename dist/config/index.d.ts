import { DatabaseConfig, RedisConfig, OpenAIConfig, EOSConfig } from '@/types';
export declare const config: {
    port: number;
    nodeEnv: string;
    database: DatabaseConfig;
    redis: RedisConfig;
    openai: OpenAIConfig;
    jwt: {
        secret: string;
        expiresIn: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    eos: EOSConfig;
};
export default config;
//# sourceMappingURL=index.d.ts.map
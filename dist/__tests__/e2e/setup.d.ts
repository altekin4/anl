import { Pool } from 'pg';
import express from 'express';
export declare class E2ETestSetup {
    app: express.Application;
    server: any;
    db: Pool;
    testPort: number;
    baseUrl: string;
    constructor();
    setup(): Promise<void>;
    teardown(): Promise<void>;
    setupTestDatabase(): Promise<void>;
    cleanupTestDatabase(): Promise<void>;
    waitForServer(): Promise<void>;
    createTestChatSession(userId?: string): Promise<string>;
    sendTestMessage(sessionId: string, content: string, userId?: string): Promise<any>;
    createWebSocketClient(): any;
}
export declare const testSetup: E2ETestSetup;
export default testSetup;
//# sourceMappingURL=setup.d.ts.map
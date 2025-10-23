import { Pool } from 'pg';
import { ChatSession } from '@/models/ChatSession';
export declare class ChatSessionRepository {
    private db;
    constructor(db: Pool);
    create(userId: string): Promise<ChatSession>;
    findById(sessionId: string): Promise<ChatSession | null>;
    findByUserId(userId: string, activeOnly?: boolean): Promise<ChatSession[]>;
    updateLastActivity(sessionId: string): Promise<void>;
    deactivate(sessionId: string): Promise<void>;
    activate(sessionId: string): Promise<void>;
    deleteExpiredSessions(timeoutMinutes?: number): Promise<number>;
    getActiveSessionCount(userId: string): Promise<number>;
}
//# sourceMappingURL=ChatSessionRepository.d.ts.map
import { Pool } from 'pg';
import { ChatMessage } from '@/models/ChatMessage';
export declare class ChatMessageRepository {
    private db;
    constructor(db: Pool);
    create(sessionId: string, message: ChatMessage): Promise<ChatMessage>;
    findBySessionId(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]>;
    findById(messageId: string): Promise<ChatMessage | null>;
    getMessageCount(sessionId: string, messageType?: 'user' | 'bot'): Promise<number>;
    getRecentMessages(sessionId: string, count?: number): Promise<ChatMessage[]>;
    updateMetadata(messageId: string, metadata: {
        intent?: string;
        entities?: Record<string, any>;
    }): Promise<void>;
    deleteBySessionId(sessionId: string): Promise<number>;
    searchMessages(sessionId: string, searchTerm: string, limit?: number): Promise<ChatMessage[]>;
}
//# sourceMappingURL=ChatMessageRepository.d.ts.map
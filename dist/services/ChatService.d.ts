import { Pool } from 'pg';
import { ChatSession } from '@/models/ChatSession';
import { ChatMessage } from '@/models/ChatMessage';
import { IChatService } from '@/types';
export declare class ChatService implements IChatService {
    private db;
    private sessionRepository;
    private messageRepository;
    constructor(db: Pool);
    createSession(userId: string): Promise<ChatSession>;
    getSession(sessionId: string): Promise<ChatSession>;
    sendMessage(sessionId: string, content: string, userId?: string): Promise<ChatMessage>;
    addBotResponse(sessionId: string, content: string, metadata?: {
        intent?: string;
        entities?: Record<string, any>;
    }): Promise<ChatMessage>;
    getSessionHistory(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]>;
    getRecentMessages(sessionId: string, count?: number): Promise<ChatMessage[]>;
    endSession(sessionId: string): Promise<void>;
    getUserSessions(userId: string, activeOnly?: boolean): Promise<ChatSession[]>;
    getMessageCount(sessionId: string, messageType?: 'user' | 'bot'): Promise<number>;
    searchMessages(sessionId: string, searchTerm: string, limit?: number): Promise<ChatMessage[]>;
    cleanupExpiredSessions(timeoutMinutes?: number): Promise<number>;
    isSessionActive(sessionId: string): Promise<boolean>;
    updateMessageMetadata(messageId: string, metadata: {
        intent?: string;
        entities?: Record<string, any>;
    }): Promise<void>;
    private addMessageToSession;
    getConversationContext(sessionId: string, messageCount?: number): Promise<string[]>;
    checkUserMessageRate(userId: string, windowMinutes?: number, maxMessages?: number): Promise<boolean>;
}
//# sourceMappingURL=ChatService.d.ts.map
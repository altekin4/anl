import { ChatSession as IChatSession, ChatMessage } from '@/types';
export declare class ChatSession implements IChatSession {
    sessionId: string;
    userId: string;
    messages: ChatMessage[];
    isActive: boolean;
    createdAt: Date;
    lastActivity: Date;
    constructor(data: Partial<IChatSession>);
    private validate;
    addMessage(message: ChatMessage): void;
    getMessageCount(): number;
    getUserMessageCount(): number;
    getBotMessageCount(): number;
    getLastMessage(): ChatMessage | null;
    getLastUserMessage(): ChatMessage | null;
    getRecentMessages(count?: number): ChatMessage[];
    updateLastActivity(): void;
    deactivate(): void;
    activate(): void;
    isExpired(timeoutMinutes?: number): boolean;
    getDurationMinutes(): number;
    getConversationContext(): string[];
    toJSON(): IChatSession;
    static fromDatabase(row: any): ChatSession;
}
//# sourceMappingURL=ChatSession.d.ts.map
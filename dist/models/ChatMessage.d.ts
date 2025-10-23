import { ChatMessage as IChatMessage } from '@/types';
export declare class ChatMessage implements IChatMessage {
    id: string;
    userId: string;
    content: string;
    type: 'user' | 'bot';
    timestamp: Date;
    metadata?: {
        intent?: string;
        entities?: Record<string, any>;
    };
    constructor(data: Partial<IChatMessage>);
    private validate;
    isFromUser(): boolean;
    isFromBot(): boolean;
    hasIntent(): boolean;
    getIntent(): string | undefined;
    setIntent(intent: string): void;
    hasEntities(): boolean;
    getEntities(): Record<string, any>;
    setEntities(entities: Record<string, any>): void;
    getEntity(key: string): any;
    setEntity(key: string, value: any): void;
    getWordCount(): number;
    getCharacterCount(): number;
    containsKeywords(keywords: string[]): boolean;
    isQuestion(): boolean;
    getAgeMinutes(): number;
    toJSON(): IChatMessage;
    static fromDatabase(row: any): ChatMessage;
    static createUserMessage(userId: string, content: string, id?: string): ChatMessage;
    static createBotMessage(userId: string, content: string, id?: string): ChatMessage;
}
//# sourceMappingURL=ChatMessage.d.ts.map
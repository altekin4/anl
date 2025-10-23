import { ConversationContext } from '../types';
export interface ContextEntry {
    timestamp: Date;
    intent: string;
    entities: Record<string, any>;
    userMessage: string;
    botResponse?: string;
}
export interface SessionContext {
    sessionId: string;
    userId: string;
    entries: ContextEntry[];
    currentEntities: Record<string, any>;
    conversationState: 'initial' | 'gathering_info' | 'processing' | 'completed';
    lastActivity: Date;
    createdAt: Date;
}
export declare class ConversationContextManager {
    private contexts;
    private readonly maxContextEntries;
    private readonly contextExpiryMinutes;
    /**
     * Initialize or get existing conversation context for a session
     */
    getOrCreateContext(sessionId: string, userId: string): SessionContext;
    /**
     * Update context with new information
     */
    updateContext(sessionId: string, data: {
        userMessage: string;
        intent: string;
        entities: Record<string, any>;
        timestamp: Date;
    }): void;
    /**
     * Add a new entry to the conversation context
     */
    addEntry(sessionId: string, intent: string, entities: Record<string, any>, userMessage: string, botResponse?: string): void;
    /**
     * Update bot response for the latest entry
     */
    updateLatestResponse(sessionId: string, botResponse: string): void;
    /**
     * Get conversation context for NLP processing
     */
    getConversationContext(sessionId: string): ConversationContext | undefined;
    /**
     * Get accumulated entities from the conversation
     */
    getAccumulatedEntities(sessionId: string): Record<string, any>;
    /**
     * Check if enough information is gathered for a specific intent
     */
    hasRequiredEntities(sessionId: string, intent: string): boolean;
    /**
     * Get missing entities for a specific intent
     */
    getMissingEntities(sessionId: string, intent: string): string[];
    /**
     * Generate clarification questions based on missing entities
     */
    generateClarificationQuestions(sessionId: string, intent: string): string[];
    /**
     * Check if user is repeating the same question
     */
    isRepeatingQuestion(sessionId: string, userMessage: string): boolean;
    /**
     * Get conversation summary for context
     */
    getConversationSummary(sessionId: string): string;
    /**
     * Clear context for a session
     */
    clearContext(sessionId: string): void;
    /**
     * Clean up expired contexts
     */
    cleanupExpiredContexts(): void;
    /**
     * Get context summary for a session
     */
    getContextSummary(sessionId: string): string;
    /**
     * Get general statistics
     */
    getStats(): {
        totalSessions: number;
        averageEntries: number;
        oldestSession: Date | null;
    };
    /**
     * Get context statistics
     */
    getContextStats(): {
        totalSessions: number;
        averageEntries: number;
        oldestSession: Date | null;
    };
    /**
     * Merge new entities into current context
     */
    private mergeEntities;
    /**
     * Update conversation state based on intent and entities
     */
    private updateConversationState;
    /**
     * Get required entities for a specific intent
     */
    private getRequiredEntitiesForIntent;
    /**
     * Get clarification question for a specific entity
     */
    private getQuestionForEntity;
    /**
     * Normalize message for comparison
     */
    private normalizeMessage;
}
//# sourceMappingURL=ConversationContextManager.d.ts.map
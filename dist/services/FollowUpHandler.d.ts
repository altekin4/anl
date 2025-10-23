import { ConversationContextManager } from './ConversationContextManager';
export interface FollowUpSuggestion {
    type: 'question' | 'action' | 'information';
    text: string;
    intent?: string;
    entities?: Record<string, any>;
    priority: number;
}
export declare class FollowUpHandler {
    private contextManager;
    constructor(contextManager: ConversationContextManager);
    /**
     * Generate follow-up suggestions based on conversation context
     */
    generateFollowUpSuggestions(sessionId: string, currentIntent: string, currentEntities: Record<string, any>): FollowUpSuggestion[];
    /**
     * Generate clarification follow-ups for incomplete information
     */
    generateClarificationFollowUps(sessionId: string, intent: string): FollowUpSuggestion[];
    /**
     * Check if user needs help based on conversation pattern
     */
    shouldOfferHelp(sessionId: string, userMessage: string): boolean;
    /**
     * Generate help suggestions when user seems confused
     */
    generateHelpSuggestions(): FollowUpSuggestion[];
    /**
     * Generate follow-ups for net calculation results
     */
    private generateNetCalculationFollowUps;
    /**
     * Generate follow-ups for base score inquiries
     */
    private generateBaseScoreFollowUps;
    /**
     * Generate follow-ups for quota inquiries
     */
    private generateQuotaFollowUps;
    /**
     * Generate follow-ups for department search
     */
    private generateDepartmentSearchFollowUps;
    /**
     * Generate contextual suggestions based on accumulated entities
     */
    private generateContextualSuggestions;
    /**
     * Generate general follow-up suggestions
     */
    private generateGeneralFollowUps;
    /**
     * Create clarification suggestion for missing entity
     */
    private createClarificationSuggestion;
    /**
     * Generate fallback suggestions when error occurs
     */
    private generateFallbackSuggestions;
    /**
     * Check if user has shown interest in engineering
     */
    private hasEngineeringInterest;
    /**
     * Check if user has shown interest in social sciences
     */
    private hasSocialScienceInterest;
    /**
     * Check if message contains confusion indicators
     */
    private containsConfusionIndicators;
}
//# sourceMappingURL=FollowUpHandler.d.ts.map
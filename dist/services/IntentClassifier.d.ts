export interface IntentClassification {
    intent: string;
    confidence: number;
    keywords: string[];
}
export declare class IntentClassifier {
    private readonly intentPatterns;
    private readonly contextModifiers;
    private readonly questionWords;
    /**
     * Classify intent from Turkish text with context awareness
     */
    classifyIntent(text: string, entities?: Record<string, any>): IntentClassification;
    /**
     * Calculate keyword matching score
     */
    private calculateKeywordScore;
    /**
     * Calculate context-based score modifiers
     */
    private calculateContextScore;
    /**
     * Handle cases where no clear intent is detected
     */
    private handleUnknownIntent;
    /**
     * Check if the text is a question
     */
    private isQuestion;
    /**
     * Normalize Turkish text for processing
     */
    private normalizeText;
    /**
     * Get intent suggestions based on current context
     */
    getIntentSuggestions(entities: Record<string, any>): string[];
    /**
     * Validate intent classification result
     */
    validateClassification(classification: IntentClassification, entities: Record<string, any>): boolean;
}
//# sourceMappingURL=IntentClassifier.d.ts.map
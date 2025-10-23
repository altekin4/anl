export interface ParsedResponse {
    content: string;
    suggestions?: string[];
    clarificationQuestions?: string[];
    followUpActions?: string[];
    confidence: number;
}
export declare class ResponseParser {
    /**
     * Parse OpenAI response and extract structured information
     */
    static parseResponse(content: string, intent: string): ParsedResponse;
    /**
     * Extract suggestion items from response
     */
    private static extractSuggestions;
    /**
     * Extract clarification questions from response
     */
    private static extractClarificationQuestions;
    /**
     * Extract follow-up actions from response
     */
    private static extractFollowUpActions;
    /**
     * Calculate confidence based on content quality
     */
    private static calculateContentConfidence;
    /**
     * Get keywords for specific intents
     */
    private static getIntentKeywords;
    /**
     * Check if a string is a valid question
     */
    private static isValidQuestion;
    /**
     * Clean and format the main content
     */
    private static cleanContent;
    /**
     * Validate parsed response
     */
    static validateResponse(parsed: ParsedResponse): boolean;
    /**
     * Format response for display
     */
    static formatForDisplay(parsed: ParsedResponse): string;
}
//# sourceMappingURL=ResponseParser.d.ts.map
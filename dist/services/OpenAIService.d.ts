import { OpenAIConfig } from '../types';
export interface OpenAIRequest {
    prompt: string;
    context?: string;
    maxTokens?: number;
    temperature?: number;
}
export interface OpenAIResponse {
    content: string;
    intent: string;
    entities: Record<string, any>;
    suggestions?: string[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
}
export interface TYTCalculation {
    turkish: {
        correct: number;
        wrong: number;
        net: number;
    };
    math: {
        correct: number;
        wrong: number;
        net: number;
    };
    science: {
        correct: number;
        wrong: number;
        net: number;
    };
    social: {
        correct: number;
        wrong: number;
        net: number;
    };
    totalNet: number;
    score: number;
}
export interface AYTCalculation {
    math: {
        correct: number;
        wrong: number;
        net: number;
    };
    physics: {
        correct: number;
        wrong: number;
        net: number;
    };
    chemistry: {
        correct: number;
        wrong: number;
        net: number;
    };
    biology: {
        correct: number;
        wrong: number;
        net: number;
    };
    literature: {
        correct: number;
        wrong: number;
        net: number;
    };
    history: {
        correct: number;
        wrong: number;
        net: number;
    };
    geography: {
        correct: number;
        wrong: number;
        net: number;
    };
    philosophy: {
        correct: number;
        wrong: number;
        net: number;
    };
    religion: {
        correct: number;
        wrong: number;
        net: number;
    };
    totalNet: number;
    score: number;
}
export declare class OpenAIService {
    private config;
    private baseUrl;
    constructor(config: OpenAIConfig);
    /**
     * Main method to generate AI response with intent classification and entity extraction
     */
    generateResponse(userMessage: string, sessionId?: string): Promise<OpenAIResponse>;
    /**
     * Generate response using OpenAI GPT API (internal method)
     */
    private generateOpenAIResponse;
    /**
     * Generate clarification questions for incomplete user queries
     */
    generateClarificationQuestions(userQuery: string, missingEntities: string[]): Promise<string[]>;
    /**
     * Generate helpful suggestions based on user context
     */
    generateSuggestions(context: string): Promise<string[]>;
    /**
     * Generate natural language explanation for calculation results
     */
    generateCalculationExplanation(university: string, department: string, calculationResult: any): Promise<string>;
    /**
     * Build messages array for chat completion
     */
    private buildMessages;
    /**
     * Intent classification
     */
    private classifyIntent;
    /**
     * Entity extraction
     */
    private extractEntities;
    /**
     * Handle TYT calculation
     */
    private handleTYTCalculation;
    /**
     * Handle AYT calculation
     */
    private handleAYTCalculation;
    /**
     * Handle study advice
     */
    private handleStudyAdvice;
    /**
     * Handle greeting
     */
    private handleGreeting;
    /**
     * Generate contextual suggestions
     */
    private generateContextualSuggestions;
    /**
     * Get system prompt for Tercih Sihirbazı
     */
    private getSystemPrompt;
    /**
     * Build prompt for clarification questions
     */
    private buildClarificationPrompt;
    /**
     * Build prompt for suggestions
     */
    private buildSuggestionsPrompt;
    /**
     * Build prompt for calculation explanation
     */
    private buildCalculationExplanationPrompt;
    /**
     * Parse clarification response into questions array
     */
    private parseClarificationResponse;
    /**
     * Parse suggestions response into suggestions array
     */
    private parseSuggestionsResponse;
    /**
     * Validate API configuration
     */
    validateConfig(): boolean;
    /**
     * Test API connection
     */
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=OpenAIService.d.ts.map
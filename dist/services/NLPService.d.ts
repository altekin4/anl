export interface NLPRequest {
    text: string;
    userId: string;
    sessionId?: string;
    context?: any;
}
export interface NLPResponse {
    intent: string;
    entities: Record<string, any>;
    confidence: number;
    message: string;
    suggestions?: string[];
    clarificationNeeded?: boolean;
    followUpQuestions?: string[];
}
export declare class NLPService {
    private intentClassifier;
    private entityExtractor;
    private contextManager;
    private followUpHandler;
    constructor();
    processMessage(request: NLPRequest): Promise<NLPResponse>;
    private generateResponse;
    private generateNetCalculationResponse;
    private generateBaseScoreResponse;
    private generateQuotaResponse;
    private generateDepartmentSearchResponse;
    private generateHelpResponse;
    private generateSuggestions;
    updateBotResponse(sessionId: string, botResponse: string): void;
    getConversationSummary(sessionId: string): string;
    clearConversationContext(sessionId: string): void;
    cleanupExpiredContexts(): void;
    getContextStats(): {
        totalSessions: number;
        averageEntries: number;
        oldestSession: Date | null;
    };
}
export default NLPService;
//# sourceMappingURL=NLPService.d.ts.map
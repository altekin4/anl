import { AppError } from '@/middleware/errorHandler';
export declare class ChatError extends AppError {
    constructor(message: string, code: string, statusCode?: number, details?: any);
}
export declare const handleChatErrors: {
    sessionNotFound: (sessionId: string) => ChatError;
    messageTooLong: (messageLength: number, maxLength?: number) => ChatError;
    rateLimitExceeded: (userId: string, limit: number) => ChatError;
    invalidMessageType: (messageType: string) => ChatError;
    nlpProcessingFailed: (error: Error, userMessage: string) => ChatError;
    openaiApiError: (error: any) => ChatError;
    contextProcessingError: (error: Error, sessionId: string) => ChatError;
};
export declare const generateChatFallbackResponse: (error: ChatError) => any;
export default handleChatErrors;
//# sourceMappingURL=chatErrorHandler.d.ts.map
import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
export declare class ChatController {
    private chatService;
    private aiService;
    constructor(db: Pool);
    /**
     * Create a new chat session
     */
    createSession(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get session details with message history
     */
    getSession(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Send a message in a chat session
     */
    sendMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get message history for a session
     */
    getMessageHistory(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get user's chat sessions
     */
    getUserSessions(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * End a chat session
     */
    endSession(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Search messages in a session
     */
    searchMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get session statistics
     */
    getSessionStats(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Health check endpoint
     */
    healthCheck(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=ChatController.d.ts.map
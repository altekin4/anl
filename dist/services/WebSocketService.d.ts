import { Server as HttpServer } from 'http';
import { Pool } from 'pg';
export declare class WebSocketService {
    private io;
    private chatService;
    private connectedUsers;
    private userSessions;
    constructor(httpServer: HttpServer, db: Pool);
    private setupMiddleware;
    private setupEventHandlers;
    sendBotResponse(sessionId: string, content: string, metadata?: any): Promise<void>;
    notifyUser(userId: string, event: string, data: any): void;
    isUserOnline(userId: string): boolean;
    getOnlineUsersCount(): number;
    getUserSocketCount(userId: string): number;
    broadcastSystemMessage(message: string): void;
    notifySession(sessionId: string, event: string, data: any): void;
}
//# sourceMappingURL=WebSocketService.d.ts.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const ChatService_1 = require("@/services/ChatService");
const MockAIService_1 = require("@/services/MockAIService");
const errors_1 = require("@/utils/errors");
const logger_1 = __importDefault(require("@/utils/logger"));
class ChatController {
    constructor(db) {
        this.chatService = new ChatService_1.ChatService(db);
        this.aiService = new MockAIService_1.MockAIService();
    }
    /**
     * Create a new chat session
     */
    async createSession(req, res, next) {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;
            if (!userId) {
                throw new errors_1.UnauthorizedError('User authentication required');
            }
            logger_1.default.info(`Creating chat session for user: ${userId}`);
            const session = await this.chatService.createSession(userId.toString());
            const response = {
                success: true,
                data: session,
            };
            logger_1.default.info(`Chat session created: ${session.sessionId}`);
            res.status(201).json(response);
        }
        catch (error) {
            logger_1.default.error('Error creating chat session:', error);
            next(error);
        }
    }
    /**
     * Get session details with message history
     */
    async getSession(req, res, next) {
        try {
            const { sessionId } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;
            if (!userId) {
                throw new errors_1.UnauthorizedError('User authentication required');
            }
            logger_1.default.debug(`Getting session ${sessionId} for user ${userId}`);
            const session = await this.chatService.getSession(sessionId);
            // Verify user owns this session
            if (session.userId !== userId.toString()) {
                throw new errors_1.UnauthorizedError('Access denied to this session');
            }
            const response = {
                success: true,
                data: session,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Error getting chat session:', error);
            next(error);
        }
    }
    /**
     * Send a message in a chat session
     */
    async sendMessage(req, res, next) {
        try {
            const { sessionId } = req.params;
            const { content } = req.body;
            const userId = req.headers['x-user-id'] || req.user?.id;
            if (!userId) {
                throw new errors_1.UnauthorizedError('User authentication required');
            }
            if (!content || typeof content !== 'string' || content.trim().length === 0) {
                throw new errors_1.ValidationError('Message content is required');
            }
            if (content.length > 1000) {
                throw new errors_1.ValidationError('Message content cannot exceed 1000 characters');
            }
            logger_1.default.debug(`Sending message in session ${sessionId} from user ${userId}`);
            // Verify session belongs to user (disabled for development)
            const session = await this.chatService.getSession(sessionId);
            logger_1.default.info(`Session ownership check: session.userId="${session.userId}", userId="${userId}"`);
            // Development: Skip ownership check
            // if (session.userId !== userId.toString()) {
            //   logger.error(`Session ownership mismatch: session.userId="${session.userId}", userId="${userId}"`);
            //   throw new UnauthorizedError('Access denied to this session');
            // }
            const message = await this.chatService.sendMessage(sessionId, content, userId.toString());
            // Generate AI response using MockAI
            const aiResponse = await this.aiService.generateResponse(content);
            // Add bot response to session with AI metadata
            const botMessage = await this.chatService.addBotResponse(sessionId, aiResponse.content, {
                intent: aiResponse.intent,
                entities: aiResponse.entities
            });
            const response = {
                success: true,
                data: {
                    userMessage: message,
                    botMessage: botMessage,
                },
            };
            logger_1.default.info(`Message sent in session ${sessionId}: ${content.substring(0, 50)}...`);
            res.status(201).json(response);
        }
        catch (error) {
            logger_1.default.error('Error sending message:', error);
            next(error);
        }
    }
    /**
     * Get message history for a session
     */
    async getMessageHistory(req, res, next) {
        try {
            const { sessionId } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
            const offset = req.query.offset ? parseInt(req.query.offset, 10) : undefined;
            if (!userId) {
                throw new errors_1.UnauthorizedError('User authentication required');
            }
            // Verify session belongs to user
            const session = await this.chatService.getSession(sessionId);
            if (session.userId !== userId.toString()) {
                throw new errors_1.UnauthorizedError('Access denied to this session');
            }
            const messages = await this.chatService.getSessionHistory(sessionId, limit, offset);
            const response = {
                success: true,
                data: messages,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Error getting message history:', error);
            next(error);
        }
    }
    /**
     * Get user's chat sessions
     */
    async getUserSessions(req, res, next) {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;
            const activeOnly = req.query.active !== 'false'; // Default to true
            if (!userId) {
                throw new errors_1.UnauthorizedError('User authentication required');
            }
            logger_1.default.debug(`Getting sessions for user ${userId}, activeOnly: ${activeOnly}`);
            const sessions = await this.chatService.getUserSessions(userId.toString(), activeOnly);
            const response = {
                success: true,
                data: sessions,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Error getting user sessions:', error);
            next(error);
        }
    }
    /**
     * End a chat session
     */
    async endSession(req, res, next) {
        try {
            const { sessionId } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;
            if (!userId) {
                throw new errors_1.UnauthorizedError('User authentication required');
            }
            // Verify session belongs to user
            const session = await this.chatService.getSession(sessionId);
            if (session.userId !== userId.toString()) {
                throw new errors_1.UnauthorizedError('Access denied to this session');
            }
            await this.chatService.endSession(sessionId);
            const response = {
                success: true,
                data: { message: 'Session ended successfully' },
            };
            logger_1.default.info(`Session ${sessionId} ended by user ${userId}`);
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Error ending session:', error);
            next(error);
        }
    }
    /**
     * Search messages in a session
     */
    async searchMessages(req, res, next) {
        try {
            const { sessionId } = req.params;
            const { q: searchTerm } = req.query;
            const userId = req.headers['x-user-id'] || req.user?.id;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            if (!userId) {
                throw new errors_1.UnauthorizedError('User authentication required');
            }
            if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
                throw new errors_1.ValidationError('Search term is required');
            }
            // Verify session belongs to user
            const session = await this.chatService.getSession(sessionId);
            if (session.userId !== userId.toString()) {
                throw new errors_1.UnauthorizedError('Access denied to this session');
            }
            const messages = await this.chatService.searchMessages(sessionId, searchTerm, limit);
            const response = {
                success: true,
                data: messages,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Error searching messages:', error);
            next(error);
        }
    }
    /**
     * Get session statistics
     */
    async getSessionStats(req, res, next) {
        try {
            const { sessionId } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;
            if (!userId) {
                throw new errors_1.UnauthorizedError('User authentication required');
            }
            // Verify session belongs to user
            const session = await this.chatService.getSession(sessionId);
            if (session.userId !== userId.toString()) {
                throw new errors_1.UnauthorizedError('Access denied to this session');
            }
            const totalMessages = await this.chatService.getMessageCount(sessionId);
            const userMessages = await this.chatService.getMessageCount(sessionId, 'user');
            const botMessages = await this.chatService.getMessageCount(sessionId, 'bot');
            const stats = {
                sessionId,
                totalMessages,
                userMessages,
                botMessages,
                isActive: session.isActive,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
                durationMinutes: session.getDurationMinutes(),
            };
            const response = {
                success: true,
                data: stats,
            };
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Error getting session stats:', error);
            next(error);
        }
    }
    /**
     * Health check endpoint
     */
    async healthCheck(req, res, next) {
        try {
            const response = {
                success: true,
                data: {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Error in health check:', error);
            next(error);
        }
    }
}
exports.ChatController = ChatController;
//# sourceMappingURL=ChatController.js.map
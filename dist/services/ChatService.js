"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const ChatMessage_1 = require("@/models/ChatMessage");
const ChatSessionRepository_1 = require("@/repositories/ChatSessionRepository");
const ChatMessageRepository_1 = require("@/repositories/ChatMessageRepository");
const errors_1 = require("@/utils/errors");
const logger_1 = __importDefault(require("@/utils/logger"));
const uuid_1 = require("uuid");
class ChatService {
    constructor(db) {
        this.db = db;
        this.sessionRepository = new ChatSessionRepository_1.ChatSessionRepository(db);
        this.messageRepository = new ChatMessageRepository_1.ChatMessageRepository(db);
    }
    async createSession(userId) {
        if (!userId || userId.trim().length === 0) {
            throw new errors_1.ValidationError('User ID is required');
        }
        try {
            // Check if user has too many active sessions (limit to 3)
            const activeSessionCount = await this.sessionRepository.getActiveSessionCount(userId);
            if (activeSessionCount >= 3) {
                throw new errors_1.BusinessLogicError('Maximum number of active sessions reached. Please close an existing session first.');
            }
            const session = await this.sessionRepository.create(userId);
            // Add welcome message
            const welcomeMessage = ChatMessage_1.ChatMessage.createBotMessage(userId, 'Merhaba! Tercih Sihirbazı\'na hoş geldiniz. Size üniversite tercihleri konusunda yardımcı olmak için buradayım. Hangi üniversite ve bölüm hakkında bilgi almak istiyorsunuz?', (0, uuid_1.v4)());
            await this.addMessageToSession(session.sessionId, welcomeMessage);
            logger_1.default.info(`Created new chat session ${session.sessionId} for user ${userId}`);
            return session;
        }
        catch (error) {
            logger_1.default.error('Error creating chat session:', error);
            throw error;
        }
    }
    async getSession(sessionId) {
        if (!sessionId || sessionId.trim().length === 0) {
            throw new errors_1.ValidationError('Session ID is required');
        }
        const session = await this.sessionRepository.findById(sessionId);
        if (!session) {
            throw new errors_1.NotFoundError('Chat session not found');
        }
        // Load messages for the session
        const messages = await this.messageRepository.findBySessionId(sessionId);
        session.messages = messages;
        return session;
    }
    async sendMessage(sessionId, content, userId) {
        if (!sessionId || sessionId.trim().length === 0) {
            throw new errors_1.ValidationError('Session ID is required');
        }
        if (!content || content.trim().length === 0) {
            throw new errors_1.ValidationError('Message content is required');
        }
        // Get session and validate
        const session = await this.getSession(sessionId);
        if (!session.isActive) {
            throw new errors_1.BusinessLogicError('Cannot send message to inactive session');
        }
        // Use userId from parameter or session
        const messageUserId = userId || session.userId;
        // Create user message
        const userMessage = ChatMessage_1.ChatMessage.createUserMessage(messageUserId, content.trim(), (0, uuid_1.v4)());
        // Save message to database
        const savedMessage = await this.addMessageToSession(sessionId, userMessage);
        // Update session activity
        await this.sessionRepository.updateLastActivity(sessionId);
        logger_1.default.debug(`User message sent in session ${sessionId}: ${content.substring(0, 50)}...`);
        return savedMessage;
    }
    async addBotResponse(sessionId, content, metadata) {
        if (!sessionId || sessionId.trim().length === 0) {
            throw new errors_1.ValidationError('Session ID is required');
        }
        if (!content || content.trim().length === 0) {
            throw new errors_1.ValidationError('Response content is required');
        }
        // Get session to get user ID
        const session = await this.getSession(sessionId);
        // Create bot message
        const botMessage = ChatMessage_1.ChatMessage.createBotMessage(session.userId, content.trim(), (0, uuid_1.v4)());
        // Add metadata if provided
        if (metadata) {
            botMessage.metadata = metadata;
        }
        // Save message to database
        const savedMessage = await this.addMessageToSession(sessionId, botMessage);
        // Update session activity
        await this.sessionRepository.updateLastActivity(sessionId);
        logger_1.default.debug(`Bot response sent in session ${sessionId}: ${content.substring(0, 50)}...`);
        return savedMessage;
    }
    async getSessionHistory(sessionId, limit, offset) {
        if (!sessionId || sessionId.trim().length === 0) {
            throw new errors_1.ValidationError('Session ID is required');
        }
        return await this.messageRepository.findBySessionId(sessionId, limit, offset);
    }
    async getRecentMessages(sessionId, count = 10) {
        if (!sessionId || sessionId.trim().length === 0) {
            throw new errors_1.ValidationError('Session ID is required');
        }
        return await this.messageRepository.getRecentMessages(sessionId, count);
    }
    async endSession(sessionId) {
        if (!sessionId || sessionId.trim().length === 0) {
            throw new errors_1.ValidationError('Session ID is required');
        }
        const session = await this.sessionRepository.findById(sessionId);
        if (!session) {
            throw new errors_1.NotFoundError('Chat session not found');
        }
        await this.sessionRepository.deactivate(sessionId);
        logger_1.default.info(`Ended chat session ${sessionId}`);
    }
    async getUserSessions(userId, activeOnly = true) {
        if (!userId || userId.trim().length === 0) {
            throw new errors_1.ValidationError('User ID is required');
        }
        return await this.sessionRepository.findByUserId(userId, activeOnly);
    }
    async getMessageCount(sessionId, messageType) {
        if (!sessionId || sessionId.trim().length === 0) {
            throw new errors_1.ValidationError('Session ID is required');
        }
        return await this.messageRepository.getMessageCount(sessionId, messageType);
    }
    async searchMessages(sessionId, searchTerm, limit = 50) {
        if (!sessionId || sessionId.trim().length === 0) {
            throw new errors_1.ValidationError('Session ID is required');
        }
        if (!searchTerm || searchTerm.trim().length === 0) {
            throw new errors_1.ValidationError('Search term is required');
        }
        return await this.messageRepository.searchMessages(sessionId, searchTerm.trim(), limit);
    }
    async cleanupExpiredSessions(timeoutMinutes = 30) {
        try {
            const deletedCount = await this.sessionRepository.deleteExpiredSessions(timeoutMinutes);
            logger_1.default.info(`Cleaned up ${deletedCount} expired sessions`);
            return deletedCount;
        }
        catch (error) {
            logger_1.default.error('Error cleaning up expired sessions:', error);
            throw error;
        }
    }
    async isSessionActive(sessionId) {
        const session = await this.sessionRepository.findById(sessionId);
        return session ? session.isActive : false;
    }
    async updateMessageMetadata(messageId, metadata) {
        if (!messageId || messageId.trim().length === 0) {
            throw new errors_1.ValidationError('Message ID is required');
        }
        await this.messageRepository.updateMetadata(messageId, metadata);
    }
    async addMessageToSession(sessionId, message) {
        try {
            return await this.messageRepository.create(sessionId, message);
        }
        catch (error) {
            logger_1.default.error('Error adding message to session:', error);
            throw error;
        }
    }
    // Utility method to get conversation context for NLP processing
    async getConversationContext(sessionId, messageCount = 5) {
        const recentMessages = await this.getRecentMessages(sessionId, messageCount);
        return recentMessages.map(msg => `${msg.type}: ${msg.content}`);
    }
    // Method to check if user is within rate limits (for additional validation)
    async checkUserMessageRate(userId, windowMinutes = 1, maxMessages = 20) {
        // This would typically be handled by middleware, but can be used for additional checks
        // Implementation would depend on your rate limiting strategy
        return true; // Placeholder - implement based on your needs
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=ChatService.js.map
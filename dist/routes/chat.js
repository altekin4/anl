"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatRoutes = void 0;
const express_1 = require("express");
const ChatController_1 = require("@/controllers/ChatController");
const chatRateLimiter_1 = require("@/middleware/chatRateLimiter");
const validation_1 = require("@/middleware/validation");
const auth_1 = require("@/middleware/auth");
// This will be injected when the routes are mounted
let chatController;
const createChatRoutes = (db) => {
    const router = (0, express_1.Router)();
    chatController = new ChatController_1.ChatController(db);
    /**
     * POST /api/chat/sessions
     * Create a new chat session
     */
    router.post('/sessions', auth_1.devAuth, chatRateLimiter_1.sessionCreationRateLimiter, chatController.createSession.bind(chatController));
    /**
     * GET /api/chat/sessions/:sessionId
     * Get session details with message history
     */
    router.get('/sessions/:sessionId', chatController.getSession.bind(chatController));
    /**
     * POST /api/chat/sessions/:sessionId/messages
     * Send a message in a chat session
     */
    router.post('/sessions/:sessionId/messages', auth_1.devAuth, chatRateLimiter_1.chatRateLimiter, validation_1.validateMessageContent, chatController.sendMessage.bind(chatController));
    /**
     * GET /api/chat/sessions/:sessionId/messages
     * Get message history for a session
     */
    router.get('/sessions/:sessionId/messages', chatController.getMessageHistory.bind(chatController));
    /**
     * GET /api/chat/sessions/:sessionId/search
     * Search messages in a session
     */
    router.get('/sessions/:sessionId/search', chatController.searchMessages.bind(chatController));
    /**
     * GET /api/chat/sessions/:sessionId/stats
     * Get session statistics
     */
    router.get('/sessions/:sessionId/stats', chatController.getSessionStats.bind(chatController));
    /**
     * DELETE /api/chat/sessions/:sessionId
     * End a chat session
     */
    router.delete('/sessions/:sessionId', chatController.endSession.bind(chatController));
    /**
     * GET /api/chat/sessions
     * Get user's chat sessions
     */
    router.get('/sessions', chatController.getUserSessions.bind(chatController));
    /**
     * GET /api/chat/health
     * Health check endpoint
     */
    router.get('/health', chatController.healthCheck.bind(chatController));
    return router;
};
exports.createChatRoutes = createChatRoutes;
exports.default = exports.createChatRoutes;
//# sourceMappingURL=chat.js.map
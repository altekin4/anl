import { Router } from 'express';
import { Pool } from 'pg';
import { ChatController } from '@/controllers/ChatController';
import { chatRateLimiter, sessionCreationRateLimiter } from '@/middleware/chatRateLimiter';
import { validateMessageContent } from '@/middleware/validation';
import { devAuth } from '@/middleware/auth';

// This will be injected when the routes are mounted
let chatController: ChatController;

export const createChatRoutes = (db: Pool): Router => {
  const router = Router();
  chatController = new ChatController(db);

  /**
   * POST /api/chat/sessions
   * Create a new chat session
   */
  router.post(
    '/sessions',
    devAuth,
    sessionCreationRateLimiter,
    chatController.createSession.bind(chatController)
  );

  /**
   * GET /api/chat/sessions/:sessionId
   * Get session details with message history
   */
  router.get(
    '/sessions/:sessionId',
    chatController.getSession.bind(chatController)
  );

  /**
   * POST /api/chat/sessions/:sessionId/messages
   * Send a message in a chat session
   */
  router.post(
    '/sessions/:sessionId/messages',
    devAuth,
    chatRateLimiter,
    validateMessageContent,
    chatController.sendMessage.bind(chatController)
  );

  /**
   * GET /api/chat/sessions/:sessionId/messages
   * Get message history for a session
   */
  router.get(
    '/sessions/:sessionId/messages',
    chatController.getMessageHistory.bind(chatController)
  );

  /**
   * GET /api/chat/sessions/:sessionId/search
   * Search messages in a session
   */
  router.get(
    '/sessions/:sessionId/search',
    chatController.searchMessages.bind(chatController)
  );

  /**
   * GET /api/chat/sessions/:sessionId/stats
   * Get session statistics
   */
  router.get(
    '/sessions/:sessionId/stats',
    chatController.getSessionStats.bind(chatController)
  );

  /**
   * DELETE /api/chat/sessions/:sessionId
   * End a chat session
   */
  router.delete(
    '/sessions/:sessionId',
    chatController.endSession.bind(chatController)
  );

  /**
   * GET /api/chat/sessions
   * Get user's chat sessions
   */
  router.get(
    '/sessions',
    chatController.getUserSessions.bind(chatController)
  );

  /**
   * GET /api/chat/health
   * Health check endpoint
   */
  router.get(
    '/health',
    chatController.healthCheck.bind(chatController)
  );

  return router;
};

export default createChatRoutes;
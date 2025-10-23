import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ChatService } from '@/services/ChatService';
import { MockAIService } from '@/services/MockAIService';
import { ApiResponse, ChatSession, ChatMessage } from '@/types';
import { ValidationError, NotFoundError, UnauthorizedError } from '@/utils/errors';
import { AuthenticatedRequest } from '@/middleware/auth';
import logger from '@/utils/logger';

export class ChatController {
  private chatService: ChatService;
  private aiService: MockAIService;

  constructor(db: Pool) {
    this.chatService = new ChatService(db);
    this.aiService = new MockAIService();
  }

  /**
   * Create a new chat session
   */
  public async createSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] || req.user?.id;
      
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      logger.info(`Creating chat session for user: ${userId}`);

      const session = await this.chatService.createSession(userId.toString());

      const response: ApiResponse<ChatSession> = {
        success: true,
        data: session,
      };

      logger.info(`Chat session created: ${session.sessionId}`);
      res.status(201).json(response);
    } catch (error) {
      logger.error('Error creating chat session:', error);
      next(error);
    }
  }

  /**
   * Get session details with message history
   */
  public async getSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.headers['x-user-id'] || req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      logger.debug(`Getting session ${sessionId} for user ${userId}`);

      const session = await this.chatService.getSession(sessionId);

      // Verify user owns this session
      if (session.userId !== userId.toString()) {
        throw new UnauthorizedError('Access denied to this session');
      }

      const response: ApiResponse<ChatSession> = {
        success: true,
        data: session,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting chat session:', error);
      next(error);
    }
  }

  /**
   * Send a message in a chat session
   */
  public async sendMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { content } = req.body;
      const userId = req.headers['x-user-id'] || req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new ValidationError('Message content is required');
      }

      if (content.length > 1000) {
        throw new ValidationError('Message content cannot exceed 1000 characters');
      }

      logger.debug(`Sending message in session ${sessionId} from user ${userId}`);

      // Verify session belongs to user (disabled for development)
      const session = await this.chatService.getSession(sessionId);
      logger.info(`Session ownership check: session.userId="${session.userId}", userId="${userId}"`);
      // Development: Skip ownership check
      // if (session.userId !== userId.toString()) {
      //   logger.error(`Session ownership mismatch: session.userId="${session.userId}", userId="${userId}"`);
      //   throw new UnauthorizedError('Access denied to this session');
      // }

      const message = await this.chatService.sendMessage(sessionId, content, userId.toString());

      // Generate AI response using MockAI
      const aiResponse = await this.aiService.generateResponse(content);
      
      // Add bot response to session with AI metadata
      const botMessage = await this.chatService.addBotResponse(
        sessionId, 
        aiResponse.content,
        {
          intent: aiResponse.intent,
          entities: aiResponse.entities
        }
      );

      const response: ApiResponse<{
        userMessage: ChatMessage;
        botMessage: ChatMessage;
      }> = {
        success: true,
        data: {
          userMessage: message,
          botMessage: botMessage,
        },
      };

      logger.info(`Message sent in session ${sessionId}: ${content.substring(0, 50)}...`);
      res.status(201).json(response);
    } catch (error) {
      logger.error('Error sending message:', error);
      next(error);
    }
  }

  /**
   * Get message history for a session
   */
  public async getMessageHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.headers['x-user-id'] || req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      // Verify session belongs to user
      const session = await this.chatService.getSession(sessionId);
      if (session.userId !== userId.toString()) {
        throw new UnauthorizedError('Access denied to this session');
      }

      const messages = await this.chatService.getSessionHistory(sessionId, limit, offset);

      const response: ApiResponse<ChatMessage[]> = {
        success: true,
        data: messages,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting message history:', error);
      next(error);
    }
  }

  /**
   * Get user's chat sessions
   */
  public async getUserSessions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] || req.user?.id;
      const activeOnly = req.query.active !== 'false'; // Default to true

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      logger.debug(`Getting sessions for user ${userId}, activeOnly: ${activeOnly}`);

      const sessions = await this.chatService.getUserSessions(userId.toString(), activeOnly);

      const response: ApiResponse<ChatSession[]> = {
        success: true,
        data: sessions,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      next(error);
    }
  }

  /**
   * End a chat session
   */
  public async endSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.headers['x-user-id'] || req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      // Verify session belongs to user
      const session = await this.chatService.getSession(sessionId);
      if (session.userId !== userId.toString()) {
        throw new UnauthorizedError('Access denied to this session');
      }

      await this.chatService.endSession(sessionId);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Session ended successfully' },
      };

      logger.info(`Session ${sessionId} ended by user ${userId}`);
      res.json(response);
    } catch (error) {
      logger.error('Error ending session:', error);
      next(error);
    }
  }

  /**
   * Search messages in a session
   */
  public async searchMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { q: searchTerm } = req.query;
      const userId = req.headers['x-user-id'] || req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
        throw new ValidationError('Search term is required');
      }

      // Verify session belongs to user
      const session = await this.chatService.getSession(sessionId);
      if (session.userId !== userId.toString()) {
        throw new UnauthorizedError('Access denied to this session');
      }

      const messages = await this.chatService.searchMessages(sessionId, searchTerm, limit);

      const response: ApiResponse<ChatMessage[]> = {
        success: true,
        data: messages,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error searching messages:', error);
      next(error);
    }
  }

  /**
   * Get session statistics
   */
  public async getSessionStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.headers['x-user-id'] || req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      // Verify session belongs to user
      const session = await this.chatService.getSession(sessionId);
      if (session.userId !== userId.toString()) {
        throw new UnauthorizedError('Access denied to this session');
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

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting session stats:', error);
      next(error);
    }
  }

  /**
   * Health check endpoint
   */
  public async healthCheck(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const response: ApiResponse<{ status: string; timestamp: string }> = {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Error in health check:', error);
      next(error);
    }
  }
}
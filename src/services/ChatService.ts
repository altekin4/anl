import { Pool } from 'pg';
import { ChatSession } from '@/models/ChatSession';
import { ChatMessage } from '@/models/ChatMessage';
import { ChatSessionRepository } from '@/repositories/ChatSessionRepository';
import { ChatMessageRepository } from '@/repositories/ChatMessageRepository';
import { IChatService } from '@/types';
import { ValidationError, NotFoundError, BusinessLogicError } from '@/utils/errors';
import logger from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { handleChatErrors, generateChatFallbackResponse } from '@/utils/chatErrorHandler';

export class ChatService implements IChatService {
  private sessionRepository: ChatSessionRepository;
  private messageRepository: ChatMessageRepository;

  constructor(private db: Pool) {
    this.sessionRepository = new ChatSessionRepository(db);
    this.messageRepository = new ChatMessageRepository(db);
  }

  async createSession(userId: string): Promise<ChatSession> {
    if (!userId || userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }

    try {
      // Check if user has too many active sessions (limit to 3)
      const activeSessionCount = await this.sessionRepository.getActiveSessionCount(userId);
      if (activeSessionCount >= 3) {
        throw new BusinessLogicError('Maximum number of active sessions reached. Please close an existing session first.');
      }

      const session = await this.sessionRepository.create(userId);
      
      // Add welcome message
      const welcomeMessage = ChatMessage.createBotMessage(
        userId,
        'Merhaba! Tercih Sihirbazı\'na hoş geldiniz. Size üniversite tercihleri konusunda yardımcı olmak için buradayım. Hangi üniversite ve bölüm hakkında bilgi almak istiyorsunuz?',
        uuidv4()
      );

      await this.addMessageToSession(session.sessionId, welcomeMessage);
      
      logger.info(`Created new chat session ${session.sessionId} for user ${userId}`);
      return session;
    } catch (error) {
      logger.error('Error creating chat session:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<ChatSession> {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Chat session not found');
    }

    // Load messages for the session
    const messages = await this.messageRepository.findBySessionId(sessionId);
    session.messages = messages;

    return session;
  }

  async sendMessage(sessionId: string, content: string, userId?: string): Promise<ChatMessage> {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }

    if (!content || content.trim().length === 0) {
      throw new ValidationError('Message content is required');
    }

    // Get session and validate
    const session = await this.getSession(sessionId);
    
    if (!session.isActive) {
      throw new BusinessLogicError('Cannot send message to inactive session');
    }

    // Use userId from parameter or session
    const messageUserId = userId || session.userId;

    // Create user message
    const userMessage = ChatMessage.createUserMessage(messageUserId, content.trim(), uuidv4());
    
    // Save message to database
    const savedMessage = await this.addMessageToSession(sessionId, userMessage);
    
    // Update session activity
    await this.sessionRepository.updateLastActivity(sessionId);
    
    logger.debug(`User message sent in session ${sessionId}: ${content.substring(0, 50)}...`);
    return savedMessage;
  }

  async addBotResponse(sessionId: string, content: string, metadata?: { intent?: string; entities?: Record<string, any> }): Promise<ChatMessage> {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }

    if (!content || content.trim().length === 0) {
      throw new ValidationError('Response content is required');
    }

    // Get session to get user ID
    const session = await this.getSession(sessionId);
    
    // Create bot message
    const botMessage = ChatMessage.createBotMessage(session.userId, content.trim(), uuidv4());
    
    // Add metadata if provided
    if (metadata) {
      botMessage.metadata = metadata;
    }
    
    // Save message to database
    const savedMessage = await this.addMessageToSession(sessionId, botMessage);
    
    // Update session activity
    await this.sessionRepository.updateLastActivity(sessionId);
    
    logger.debug(`Bot response sent in session ${sessionId}: ${content.substring(0, 50)}...`);
    return savedMessage;
  }

  async getSessionHistory(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]> {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }

    return await this.messageRepository.findBySessionId(sessionId, limit, offset);
  }

  async getRecentMessages(sessionId: string, count: number = 10): Promise<ChatMessage[]> {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }

    return await this.messageRepository.getRecentMessages(sessionId, count);
  }

  async endSession(sessionId: string): Promise<void> {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Chat session not found');
    }

    await this.sessionRepository.deactivate(sessionId);
    logger.info(`Ended chat session ${sessionId}`);
  }

  async getUserSessions(userId: string, activeOnly: boolean = true): Promise<ChatSession[]> {
    if (!userId || userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }

    return await this.sessionRepository.findByUserId(userId, activeOnly);
  }

  async getMessageCount(sessionId: string, messageType?: 'user' | 'bot'): Promise<number> {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }

    return await this.messageRepository.getMessageCount(sessionId, messageType);
  }

  async searchMessages(sessionId: string, searchTerm: string, limit: number = 50): Promise<ChatMessage[]> {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }

    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new ValidationError('Search term is required');
    }

    return await this.messageRepository.searchMessages(sessionId, searchTerm.trim(), limit);
  }

  async cleanupExpiredSessions(timeoutMinutes: number = 30): Promise<number> {
    try {
      const deletedCount = await this.sessionRepository.deleteExpiredSessions(timeoutMinutes);
      logger.info(`Cleaned up ${deletedCount} expired sessions`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }

  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.sessionRepository.findById(sessionId);
    return session ? session.isActive : false;
  }

  async updateMessageMetadata(messageId: string, metadata: { intent?: string; entities?: Record<string, any> }): Promise<void> {
    if (!messageId || messageId.trim().length === 0) {
      throw new ValidationError('Message ID is required');
    }

    await this.messageRepository.updateMetadata(messageId, metadata);
  }

  private async addMessageToSession(sessionId: string, message: ChatMessage): Promise<ChatMessage> {
    try {
      return await this.messageRepository.create(sessionId, message);
    } catch (error) {
      logger.error('Error adding message to session:', error);
      throw error;
    }
  }

  // Utility method to get conversation context for NLP processing
  async getConversationContext(sessionId: string, messageCount: number = 5): Promise<string[]> {
    const recentMessages = await this.getRecentMessages(sessionId, messageCount);
    return recentMessages.map(msg => `${msg.type}: ${msg.content}`);
  }

  // Method to check if user is within rate limits (for additional validation)
  async checkUserMessageRate(userId: string, windowMinutes: number = 1, maxMessages: number = 20): Promise<boolean> {
    // This would typically be handled by middleware, but can be used for additional checks
    // Implementation would depend on your rate limiting strategy
    return true; // Placeholder - implement based on your needs
  }
}
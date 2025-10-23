import { Pool } from 'pg';
import { ChatSession } from '@/models/ChatSession';
import { ChatMessage } from '@/models/ChatMessage';
import { DatabaseError } from '@/utils/errors';
import logger from '@/utils/logger';

export class ChatSessionRepository {
  constructor(private db: Pool) {}

  async create(userId: string): Promise<ChatSession> {
    const client = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO chat_sessions (user_id, created_at, last_activity, is_active)
        VALUES ($1, NOW(), NOW(), true)
        RETURNING id, user_id, created_at, last_activity, is_active
      `;
      
      const result = await client.query(query, [userId]);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create chat session');
      }

      const row = result.rows[0];
      const session = ChatSession.fromDatabase(row);
      
      logger.info(`Created chat session ${session.sessionId} for user ${userId}`);
      return session;
    } catch (error) {
      logger.error('Error creating chat session:', error);
      throw new DatabaseError('Failed to create chat session');
    } finally {
      client.release();
    }
  }

  async findById(sessionId: string): Promise<ChatSession | null> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT id, user_id, created_at, last_activity, is_active
        FROM chat_sessions
        WHERE id = $1
      `;
      
      const result = await client.query(query, [sessionId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return ChatSession.fromDatabase(result.rows[0]);
    } catch (error) {
      logger.error('Error finding chat session:', error);
      throw new DatabaseError('Failed to find chat session');
    } finally {
      client.release();
    }
  }

  async findByUserId(userId: string, activeOnly: boolean = true): Promise<ChatSession[]> {
    const client = await this.db.connect();
    
    try {
      let query = `
        SELECT id, user_id, created_at, last_activity, is_active
        FROM chat_sessions
        WHERE user_id = $1
      `;
      
      if (activeOnly) {
        query += ' AND is_active = true';
      }
      
      query += ' ORDER BY last_activity DESC';
      
      const result = await client.query(query, [userId]);
      
      return result.rows.map(row => ChatSession.fromDatabase(row));
    } catch (error) {
      logger.error('Error finding chat sessions by user:', error);
      throw new DatabaseError('Failed to find chat sessions');
    } finally {
      client.release();
    }
  }

  async updateLastActivity(sessionId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      const query = `
        UPDATE chat_sessions
        SET last_activity = NOW()
        WHERE id = $1
      `;
      
      await client.query(query, [sessionId]);
    } catch (error) {
      logger.error('Error updating session activity:', error);
      throw new DatabaseError('Failed to update session activity');
    } finally {
      client.release();
    }
  }

  async deactivate(sessionId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      const query = `
        UPDATE chat_sessions
        SET is_active = false, last_activity = NOW()
        WHERE id = $1
      `;
      
      await client.query(query, [sessionId]);
      logger.info(`Deactivated chat session ${sessionId}`);
    } catch (error) {
      logger.error('Error deactivating chat session:', error);
      throw new DatabaseError('Failed to deactivate chat session');
    } finally {
      client.release();
    }
  }

  async activate(sessionId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      const query = `
        UPDATE chat_sessions
        SET is_active = true, last_activity = NOW()
        WHERE id = $1
      `;
      
      await client.query(query, [sessionId]);
      logger.info(`Activated chat session ${sessionId}`);
    } catch (error) {
      logger.error('Error activating chat session:', error);
      throw new DatabaseError('Failed to activate chat session');
    } finally {
      client.release();
    }
  }

  async deleteExpiredSessions(timeoutMinutes: number = 30): Promise<number> {
    const client = await this.db.connect();
    
    try {
      const query = `
        DELETE FROM chat_sessions
        WHERE last_activity < NOW() - INTERVAL '${timeoutMinutes} minutes'
        AND is_active = false
      `;
      
      const result = await client.query(query);
      const deletedCount = result.rowCount || 0;
      
      if (deletedCount > 0) {
        logger.info(`Deleted ${deletedCount} expired chat sessions`);
      }
      
      return deletedCount;
    } catch (error) {
      logger.error('Error deleting expired sessions:', error);
      throw new DatabaseError('Failed to delete expired sessions');
    } finally {
      client.release();
    }
  }

  async getActiveSessionCount(userId: string): Promise<number> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM chat_sessions
        WHERE user_id = $1 AND is_active = true
      `;
      
      const result = await client.query(query, [userId]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error getting active session count:', error);
      throw new DatabaseError('Failed to get active session count');
    } finally {
      client.release();
    }
  }
}
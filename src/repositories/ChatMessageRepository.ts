import { Pool } from 'pg';
import { ChatMessage } from '@/models/ChatMessage';
import { DatabaseError } from '@/utils/errors';
import logger from '@/utils/logger';

export class ChatMessageRepository {
  constructor(private db: Pool) {}

  async create(sessionId: string, message: ChatMessage): Promise<ChatMessage> {
    const client = await this.db.connect();
    
    try {
      const query = `
        INSERT INTO chat_messages (id, session_id, user_id, content, message_type, intent, entities, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, session_id, user_id, content, message_type, intent, entities, created_at
      `;
      
      const values = [
        message.id,
        sessionId,
        message.userId,
        message.content,
        message.type,
        message.metadata?.intent || null,
        message.metadata?.entities ? JSON.stringify(message.metadata.entities) : null,
        message.timestamp
      ];
      
      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create chat message');
      }

      const savedMessage = ChatMessage.fromDatabase(result.rows[0]);
      logger.debug(`Created chat message ${savedMessage.id} in session ${sessionId}`);
      
      return savedMessage;
    } catch (error) {
      logger.error('Error creating chat message:', error);
      throw new DatabaseError('Failed to create chat message');
    } finally {
      client.release();
    }
  }

  async findBySessionId(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]> {
    const client = await this.db.connect();
    
    try {
      let query = `
        SELECT id, session_id, user_id, content, message_type, intent, entities, created_at
        FROM chat_messages
        WHERE session_id = $1
        ORDER BY created_at ASC
      `;
      
      const params: any[] = [sessionId];
      
      if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }
      
      if (offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }
      
      const result = await client.query(query, params);
      
      return result.rows.map(row => ChatMessage.fromDatabase(row));
    } catch (error) {
      logger.error('Error finding messages by session:', error);
      throw new DatabaseError('Failed to find messages');
    } finally {
      client.release();
    }
  }

  async findById(messageId: string): Promise<ChatMessage | null> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT id, session_id, user_id, content, message_type, intent, entities, created_at
        FROM chat_messages
        WHERE id = $1
      `;
      
      const result = await client.query(query, [messageId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return ChatMessage.fromDatabase(result.rows[0]);
    } catch (error) {
      logger.error('Error finding chat message:', error);
      throw new DatabaseError('Failed to find chat message');
    } finally {
      client.release();
    }
  }

  async getMessageCount(sessionId: string, messageType?: 'user' | 'bot'): Promise<number> {
    const client = await this.db.connect();
    
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM chat_messages
        WHERE session_id = $1
      `;
      
      const params: any[] = [sessionId];
      
      if (messageType) {
        query += ` AND message_type = $${params.length + 1}`;
        params.push(messageType);
      }
      
      const result = await client.query(query, params);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error getting message count:', error);
      throw new DatabaseError('Failed to get message count');
    } finally {
      client.release();
    }
  }

  async getRecentMessages(sessionId: string, count: number = 10): Promise<ChatMessage[]> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT id, session_id, user_id, content, message_type, intent, entities, created_at
        FROM chat_messages
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const result = await client.query(query, [sessionId, count]);
      
      // Reverse to get chronological order
      return result.rows.reverse().map(row => ChatMessage.fromDatabase(row));
    } catch (error) {
      logger.error('Error getting recent messages:', error);
      throw new DatabaseError('Failed to get recent messages');
    } finally {
      client.release();
    }
  }

  async updateMetadata(messageId: string, metadata: { intent?: string; entities?: Record<string, any> }): Promise<void> {
    const client = await this.db.connect();
    
    try {
      const query = `
        UPDATE chat_messages
        SET intent = $2, entities = $3
        WHERE id = $1
      `;
      
      const values = [
        messageId,
        metadata.intent || null,
        metadata.entities ? JSON.stringify(metadata.entities) : null
      ];
      
      await client.query(query, values);
    } catch (error) {
      logger.error('Error updating message metadata:', error);
      throw new DatabaseError('Failed to update message metadata');
    } finally {
      client.release();
    }
  }

  async deleteBySessionId(sessionId: string): Promise<number> {
    const client = await this.db.connect();
    
    try {
      const query = `
        DELETE FROM chat_messages
        WHERE session_id = $1
      `;
      
      const result = await client.query(query, [sessionId]);
      const deletedCount = result.rowCount || 0;
      
      if (deletedCount > 0) {
        logger.info(`Deleted ${deletedCount} messages from session ${sessionId}`);
      }
      
      return deletedCount;
    } catch (error) {
      logger.error('Error deleting messages by session:', error);
      throw new DatabaseError('Failed to delete messages');
    } finally {
      client.release();
    }
  }

  async searchMessages(sessionId: string, searchTerm: string, limit: number = 50): Promise<ChatMessage[]> {
    const client = await this.db.connect();
    
    try {
      const query = `
        SELECT id, session_id, user_id, content, message_type, intent, entities, created_at
        FROM chat_messages
        WHERE session_id = $1 AND content ILIKE $2
        ORDER BY created_at DESC
        LIMIT $3
      `;
      
      const result = await client.query(query, [sessionId, `%${searchTerm}%`, limit]);
      
      return result.rows.map(row => ChatMessage.fromDatabase(row));
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw new DatabaseError('Failed to search messages');
    } finally {
      client.release();
    }
  }
}
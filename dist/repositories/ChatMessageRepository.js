"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessageRepository = void 0;
const ChatMessage_1 = require("@/models/ChatMessage");
const errors_1 = require("@/utils/errors");
const logger_1 = __importDefault(require("@/utils/logger"));
class ChatMessageRepository {
    constructor(db) {
        this.db = db;
    }
    async create(sessionId, message) {
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
                throw new errors_1.DatabaseError('Failed to create chat message');
            }
            const savedMessage = ChatMessage_1.ChatMessage.fromDatabase(result.rows[0]);
            logger_1.default.debug(`Created chat message ${savedMessage.id} in session ${sessionId}`);
            return savedMessage;
        }
        catch (error) {
            logger_1.default.error('Error creating chat message:', error);
            throw new errors_1.DatabaseError('Failed to create chat message');
        }
        finally {
            client.release();
        }
    }
    async findBySessionId(sessionId, limit, offset) {
        const client = await this.db.connect();
        try {
            let query = `
        SELECT id, session_id, user_id, content, message_type, intent, entities, created_at
        FROM chat_messages
        WHERE session_id = $1
        ORDER BY created_at ASC
      `;
            const params = [sessionId];
            if (limit) {
                query += ` LIMIT $${params.length + 1}`;
                params.push(limit);
            }
            if (offset) {
                query += ` OFFSET $${params.length + 1}`;
                params.push(offset);
            }
            const result = await client.query(query, params);
            return result.rows.map(row => ChatMessage_1.ChatMessage.fromDatabase(row));
        }
        catch (error) {
            logger_1.default.error('Error finding messages by session:', error);
            throw new errors_1.DatabaseError('Failed to find messages');
        }
        finally {
            client.release();
        }
    }
    async findById(messageId) {
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
            return ChatMessage_1.ChatMessage.fromDatabase(result.rows[0]);
        }
        catch (error) {
            logger_1.default.error('Error finding chat message:', error);
            throw new errors_1.DatabaseError('Failed to find chat message');
        }
        finally {
            client.release();
        }
    }
    async getMessageCount(sessionId, messageType) {
        const client = await this.db.connect();
        try {
            let query = `
        SELECT COUNT(*) as count
        FROM chat_messages
        WHERE session_id = $1
      `;
            const params = [sessionId];
            if (messageType) {
                query += ` AND message_type = $${params.length + 1}`;
                params.push(messageType);
            }
            const result = await client.query(query, params);
            return parseInt(result.rows[0].count, 10);
        }
        catch (error) {
            logger_1.default.error('Error getting message count:', error);
            throw new errors_1.DatabaseError('Failed to get message count');
        }
        finally {
            client.release();
        }
    }
    async getRecentMessages(sessionId, count = 10) {
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
            return result.rows.reverse().map(row => ChatMessage_1.ChatMessage.fromDatabase(row));
        }
        catch (error) {
            logger_1.default.error('Error getting recent messages:', error);
            throw new errors_1.DatabaseError('Failed to get recent messages');
        }
        finally {
            client.release();
        }
    }
    async updateMetadata(messageId, metadata) {
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
        }
        catch (error) {
            logger_1.default.error('Error updating message metadata:', error);
            throw new errors_1.DatabaseError('Failed to update message metadata');
        }
        finally {
            client.release();
        }
    }
    async deleteBySessionId(sessionId) {
        const client = await this.db.connect();
        try {
            const query = `
        DELETE FROM chat_messages
        WHERE session_id = $1
      `;
            const result = await client.query(query, [sessionId]);
            const deletedCount = result.rowCount || 0;
            if (deletedCount > 0) {
                logger_1.default.info(`Deleted ${deletedCount} messages from session ${sessionId}`);
            }
            return deletedCount;
        }
        catch (error) {
            logger_1.default.error('Error deleting messages by session:', error);
            throw new errors_1.DatabaseError('Failed to delete messages');
        }
        finally {
            client.release();
        }
    }
    async searchMessages(sessionId, searchTerm, limit = 50) {
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
            return result.rows.map(row => ChatMessage_1.ChatMessage.fromDatabase(row));
        }
        catch (error) {
            logger_1.default.error('Error searching messages:', error);
            throw new errors_1.DatabaseError('Failed to search messages');
        }
        finally {
            client.release();
        }
    }
}
exports.ChatMessageRepository = ChatMessageRepository;
//# sourceMappingURL=ChatMessageRepository.js.map
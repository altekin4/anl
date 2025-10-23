"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSessionRepository = void 0;
const ChatSession_1 = require("@/models/ChatSession");
const errors_1 = require("@/utils/errors");
const logger_1 = __importDefault(require("@/utils/logger"));
class ChatSessionRepository {
    constructor(db) {
        this.db = db;
    }
    async create(userId) {
        const client = await this.db.connect();
        try {
            const query = `
        INSERT INTO chat_sessions (user_id, created_at, last_activity, is_active)
        VALUES ($1, NOW(), NOW(), true)
        RETURNING id, user_id, created_at, last_activity, is_active
      `;
            const result = await client.query(query, [userId]);
            if (result.rows.length === 0) {
                throw new errors_1.DatabaseError('Failed to create chat session');
            }
            const row = result.rows[0];
            const session = ChatSession_1.ChatSession.fromDatabase(row);
            logger_1.default.info(`Created chat session ${session.sessionId} for user ${userId}`);
            return session;
        }
        catch (error) {
            logger_1.default.error('Error creating chat session:', error);
            throw new errors_1.DatabaseError('Failed to create chat session');
        }
        finally {
            client.release();
        }
    }
    async findById(sessionId) {
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
            return ChatSession_1.ChatSession.fromDatabase(result.rows[0]);
        }
        catch (error) {
            logger_1.default.error('Error finding chat session:', error);
            throw new errors_1.DatabaseError('Failed to find chat session');
        }
        finally {
            client.release();
        }
    }
    async findByUserId(userId, activeOnly = true) {
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
            return result.rows.map(row => ChatSession_1.ChatSession.fromDatabase(row));
        }
        catch (error) {
            logger_1.default.error('Error finding chat sessions by user:', error);
            throw new errors_1.DatabaseError('Failed to find chat sessions');
        }
        finally {
            client.release();
        }
    }
    async updateLastActivity(sessionId) {
        const client = await this.db.connect();
        try {
            const query = `
        UPDATE chat_sessions
        SET last_activity = NOW()
        WHERE id = $1
      `;
            await client.query(query, [sessionId]);
        }
        catch (error) {
            logger_1.default.error('Error updating session activity:', error);
            throw new errors_1.DatabaseError('Failed to update session activity');
        }
        finally {
            client.release();
        }
    }
    async deactivate(sessionId) {
        const client = await this.db.connect();
        try {
            const query = `
        UPDATE chat_sessions
        SET is_active = false, last_activity = NOW()
        WHERE id = $1
      `;
            await client.query(query, [sessionId]);
            logger_1.default.info(`Deactivated chat session ${sessionId}`);
        }
        catch (error) {
            logger_1.default.error('Error deactivating chat session:', error);
            throw new errors_1.DatabaseError('Failed to deactivate chat session');
        }
        finally {
            client.release();
        }
    }
    async activate(sessionId) {
        const client = await this.db.connect();
        try {
            const query = `
        UPDATE chat_sessions
        SET is_active = true, last_activity = NOW()
        WHERE id = $1
      `;
            await client.query(query, [sessionId]);
            logger_1.default.info(`Activated chat session ${sessionId}`);
        }
        catch (error) {
            logger_1.default.error('Error activating chat session:', error);
            throw new errors_1.DatabaseError('Failed to activate chat session');
        }
        finally {
            client.release();
        }
    }
    async deleteExpiredSessions(timeoutMinutes = 30) {
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
                logger_1.default.info(`Deleted ${deletedCount} expired chat sessions`);
            }
            return deletedCount;
        }
        catch (error) {
            logger_1.default.error('Error deleting expired sessions:', error);
            throw new errors_1.DatabaseError('Failed to delete expired sessions');
        }
        finally {
            client.release();
        }
    }
    async getActiveSessionCount(userId) {
        const client = await this.db.connect();
        try {
            const query = `
        SELECT COUNT(*) as count
        FROM chat_sessions
        WHERE user_id = $1 AND is_active = true
      `;
            const result = await client.query(query, [userId]);
            return parseInt(result.rows[0].count, 10);
        }
        catch (error) {
            logger_1.default.error('Error getting active session count:', error);
            throw new errors_1.DatabaseError('Failed to get active session count');
        }
        finally {
            client.release();
        }
    }
}
exports.ChatSessionRepository = ChatSessionRepository;
//# sourceMappingURL=ChatSessionRepository.js.map
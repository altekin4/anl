"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSession = void 0;
const errors_1 = require("@/utils/errors");
class ChatSession {
    constructor(data) {
        this.sessionId = data.sessionId || '';
        this.userId = data.userId || '';
        this.messages = data.messages || [];
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.createdAt = data.createdAt || new Date();
        this.lastActivity = data.lastActivity || new Date();
        this.validate();
    }
    validate() {
        if (!this.sessionId || this.sessionId.trim().length === 0) {
            throw new errors_1.ValidationError('Session ID is required');
        }
        if (!this.userId || this.userId.trim().length === 0) {
            throw new errors_1.ValidationError('User ID is required');
        }
        if (!Array.isArray(this.messages)) {
            throw new errors_1.ValidationError('Messages must be an array');
        }
        if (typeof this.isActive !== 'boolean') {
            throw new errors_1.ValidationError('isActive must be a boolean');
        }
    }
    addMessage(message) {
        if (!message) {
            throw new errors_1.ValidationError('Message is required');
        }
        if (message.userId !== this.userId) {
            throw new errors_1.ValidationError('Message user ID must match session user ID');
        }
        this.messages.push(message);
        this.updateLastActivity();
    }
    getMessageCount() {
        return this.messages.length;
    }
    getUserMessageCount() {
        return this.messages.filter(msg => msg.type === 'user').length;
    }
    getBotMessageCount() {
        return this.messages.filter(msg => msg.type === 'bot').length;
    }
    getLastMessage() {
        return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
    }
    getLastUserMessage() {
        const userMessages = this.messages.filter(msg => msg.type === 'user');
        return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
    }
    getRecentMessages(count = 10) {
        return this.messages.slice(-count);
    }
    updateLastActivity() {
        this.lastActivity = new Date();
    }
    deactivate() {
        this.isActive = false;
        this.updateLastActivity();
    }
    activate() {
        this.isActive = true;
        this.updateLastActivity();
    }
    isExpired(timeoutMinutes = 30) {
        const now = new Date();
        const diffMinutes = (now.getTime() - this.lastActivity.getTime()) / (1000 * 60);
        return diffMinutes > timeoutMinutes;
    }
    getDurationMinutes() {
        const diffMs = this.lastActivity.getTime() - this.createdAt.getTime();
        return Math.round(diffMs / (1000 * 60));
    }
    getConversationContext() {
        return this.messages
            .slice(-5) // Last 5 messages for context
            .map(msg => `${msg.type}: ${msg.content}`);
    }
    toJSON() {
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            messages: this.messages.map(msg => ({ ...msg })),
            isActive: this.isActive,
            createdAt: this.createdAt,
            lastActivity: this.lastActivity,
        };
    }
    static fromDatabase(row) {
        return new ChatSession({
            sessionId: row.id,
            userId: row.user_id.toString(),
            messages: [], // Messages loaded separately
            isActive: row.is_active,
            createdAt: new Date(row.created_at),
            lastActivity: new Date(row.last_activity),
        });
    }
}
exports.ChatSession = ChatSession;
//# sourceMappingURL=ChatSession.js.map
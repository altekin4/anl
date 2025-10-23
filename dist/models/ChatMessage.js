"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessage = void 0;
const errors_1 = require("@/utils/errors");
class ChatMessage {
    constructor(data) {
        this.id = data.id || '';
        this.userId = data.userId || '';
        this.content = data.content || '';
        this.type = data.type || 'user';
        this.timestamp = data.timestamp || new Date();
        this.metadata = data.metadata;
        this.validate();
    }
    validate() {
        if (!this.id || this.id.trim().length === 0) {
            throw new errors_1.ValidationError('Message ID is required');
        }
        if (!this.userId || this.userId.trim().length === 0) {
            throw new errors_1.ValidationError('User ID is required');
        }
        if (!this.content || this.content.trim().length === 0) {
            throw new errors_1.ValidationError('Message content is required');
        }
        if (this.content.length > 1000) {
            throw new errors_1.ValidationError('Message content cannot exceed 1000 characters');
        }
        if (!['user', 'bot'].includes(this.type)) {
            throw new errors_1.ValidationError('Message type must be either "user" or "bot"');
        }
    }
    isFromUser() {
        return this.type === 'user';
    }
    isFromBot() {
        return this.type === 'bot';
    }
    hasIntent() {
        return !!(this.metadata?.intent);
    }
    getIntent() {
        return this.metadata?.intent;
    }
    setIntent(intent) {
        if (!this.metadata) {
            this.metadata = {};
        }
        this.metadata.intent = intent;
    }
    hasEntities() {
        return !!(this.metadata?.entities && Object.keys(this.metadata.entities).length > 0);
    }
    getEntities() {
        return this.metadata?.entities || {};
    }
    setEntities(entities) {
        if (!this.metadata) {
            this.metadata = {};
        }
        this.metadata.entities = entities;
    }
    getEntity(key) {
        return this.metadata?.entities?.[key];
    }
    setEntity(key, value) {
        if (!this.metadata) {
            this.metadata = {};
        }
        if (!this.metadata.entities) {
            this.metadata.entities = {};
        }
        this.metadata.entities[key] = value;
    }
    getWordCount() {
        return this.content.trim().split(/\s+/).length;
    }
    getCharacterCount() {
        return this.content.length;
    }
    containsKeywords(keywords) {
        const lowerContent = this.content.toLowerCase();
        return keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()));
    }
    isQuestion() {
        return this.content.trim().endsWith('?') ||
            this.content.toLowerCase().includes('kaç') ||
            this.content.toLowerCase().includes('nedir') ||
            this.content.toLowerCase().includes('hangi');
    }
    getAgeMinutes() {
        const now = new Date();
        const diffMs = now.getTime() - this.timestamp.getTime();
        return Math.round(diffMs / (1000 * 60));
    }
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            content: this.content,
            type: this.type,
            timestamp: this.timestamp,
            metadata: this.metadata ? { ...this.metadata } : undefined,
        };
    }
    static fromDatabase(row) {
        return new ChatMessage({
            id: row.id,
            userId: row.user_id.toString(),
            content: row.content,
            type: row.message_type,
            timestamp: new Date(row.created_at),
            metadata: {
                intent: row.intent,
                entities: row.entities,
            },
        });
    }
    static createUserMessage(userId, content, id) {
        return new ChatMessage({
            id: id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            userId,
            content,
            type: 'user',
            timestamp: new Date(),
        });
    }
    static createBotMessage(userId, content, id) {
        return new ChatMessage({
            id: id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            userId,
            content,
            type: 'bot',
            timestamp: new Date(),
        });
    }
}
exports.ChatMessage = ChatMessage;
//# sourceMappingURL=ChatMessage.js.map
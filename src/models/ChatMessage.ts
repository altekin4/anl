import { ChatMessage as IChatMessage } from '@/types';
import { ValidationError } from '@/utils/errors';

export class ChatMessage implements IChatMessage {
  public id: string;
  public userId: string;
  public content: string;
  public type: 'user' | 'bot';
  public timestamp: Date;
  public metadata?: {
    intent?: string;
    entities?: Record<string, any>;
  };

  constructor(data: Partial<IChatMessage>) {
    this.id = data.id || '';
    this.userId = data.userId || '';
    this.content = data.content || '';
    this.type = data.type || 'user';
    this.timestamp = data.timestamp || new Date();
    this.metadata = data.metadata;

    this.validate();
  }

  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new ValidationError('Message ID is required');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }

    if (!this.content || this.content.trim().length === 0) {
      throw new ValidationError('Message content is required');
    }

    if (this.content.length > 1000) {
      throw new ValidationError('Message content cannot exceed 1000 characters');
    }

    if (!['user', 'bot'].includes(this.type)) {
      throw new ValidationError('Message type must be either "user" or "bot"');
    }
  }

  public isFromUser(): boolean {
    return this.type === 'user';
  }

  public isFromBot(): boolean {
    return this.type === 'bot';
  }

  public hasIntent(): boolean {
    return !!(this.metadata?.intent);
  }

  public getIntent(): string | undefined {
    return this.metadata?.intent;
  }

  public setIntent(intent: string): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata.intent = intent;
  }

  public hasEntities(): boolean {
    return !!(this.metadata?.entities && Object.keys(this.metadata.entities).length > 0);
  }

  public getEntities(): Record<string, any> {
    return this.metadata?.entities || {};
  }

  public setEntities(entities: Record<string, any>): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata.entities = entities;
  }

  public getEntity(key: string): any {
    return this.metadata?.entities?.[key];
  }

  public setEntity(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    if (!this.metadata.entities) {
      this.metadata.entities = {};
    }
    this.metadata.entities[key] = value;
  }

  public getWordCount(): number {
    return this.content.trim().split(/\s+/).length;
  }

  public getCharacterCount(): number {
    return this.content.length;
  }

  public containsKeywords(keywords: string[]): boolean {
    const lowerContent = this.content.toLowerCase();
    return keywords.some(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );
  }

  public isQuestion(): boolean {
    return this.content.trim().endsWith('?') || 
           this.content.toLowerCase().includes('kaç') ||
           this.content.toLowerCase().includes('nedir') ||
           this.content.toLowerCase().includes('hangi');
  }

  public getAgeMinutes(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.timestamp.getTime();
    return Math.round(diffMs / (1000 * 60));
  }

  public toJSON(): IChatMessage {
    return {
      id: this.id,
      userId: this.userId,
      content: this.content,
      type: this.type,
      timestamp: this.timestamp,
      metadata: this.metadata ? { ...this.metadata } : undefined,
    };
  }

  public static fromDatabase(row: any): ChatMessage {
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

  public static createUserMessage(userId: string, content: string, id?: string): ChatMessage {
    return new ChatMessage({
      id: id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      userId,
      content,
      type: 'user',
      timestamp: new Date(),
    });
  }

  public static createBotMessage(userId: string, content: string, id?: string): ChatMessage {
    return new ChatMessage({
      id: id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      userId,
      content,
      type: 'bot',
      timestamp: new Date(),
    });
  }
}
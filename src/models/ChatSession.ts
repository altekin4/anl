import { ChatSession as IChatSession, ChatMessage } from '@/types';
import { ValidationError } from '@/utils/errors';

export class ChatSession implements IChatSession {
  public sessionId: string;
  public userId: string;
  public messages: ChatMessage[];
  public isActive: boolean;
  public createdAt: Date;
  public lastActivity: Date;

  constructor(data: Partial<IChatSession>) {
    this.sessionId = data.sessionId || '';
    this.userId = data.userId || '';
    this.messages = data.messages || [];
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.lastActivity = data.lastActivity || new Date();

    this.validate();
  }

  private validate(): void {
    if (!this.sessionId || this.sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }

    if (!Array.isArray(this.messages)) {
      throw new ValidationError('Messages must be an array');
    }

    if (typeof this.isActive !== 'boolean') {
      throw new ValidationError('isActive must be a boolean');
    }
  }

  public addMessage(message: ChatMessage): void {
    if (!message) {
      throw new ValidationError('Message is required');
    }

    if (message.userId !== this.userId) {
      throw new ValidationError('Message user ID must match session user ID');
    }

    this.messages.push(message);
    this.updateLastActivity();
  }

  public getMessageCount(): number {
    return this.messages.length;
  }

  public getUserMessageCount(): number {
    return this.messages.filter(msg => msg.type === 'user').length;
  }

  public getBotMessageCount(): number {
    return this.messages.filter(msg => msg.type === 'bot').length;
  }

  public getLastMessage(): ChatMessage | null {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  public getLastUserMessage(): ChatMessage | null {
    const userMessages = this.messages.filter(msg => msg.type === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }

  public getRecentMessages(count: number = 10): ChatMessage[] {
    return this.messages.slice(-count);
  }

  public updateLastActivity(): void {
    this.lastActivity = new Date();
  }

  public deactivate(): void {
    this.isActive = false;
    this.updateLastActivity();
  }

  public activate(): void {
    this.isActive = true;
    this.updateLastActivity();
  }

  public isExpired(timeoutMinutes: number = 30): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - this.lastActivity.getTime()) / (1000 * 60);
    return diffMinutes > timeoutMinutes;
  }

  public getDurationMinutes(): number {
    const diffMs = this.lastActivity.getTime() - this.createdAt.getTime();
    return Math.round(diffMs / (1000 * 60));
  }

  public getConversationContext(): string[] {
    return this.messages
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.type}: ${msg.content}`);
  }

  public toJSON(): IChatSession {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      messages: this.messages.map(msg => ({ ...msg })),
      isActive: this.isActive,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
    };
  }

  public static fromDatabase(row: any): ChatSession {
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
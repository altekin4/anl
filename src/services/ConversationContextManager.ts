import { ConversationContext } from '../types';
import logger from '../utils/logger';

export interface ContextEntry {
  timestamp: Date;
  intent: string;
  entities: Record<string, any>;
  userMessage: string;
  botResponse?: string;
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  entries: ContextEntry[];
  currentEntities: Record<string, any>;
  conversationState: 'initial' | 'gathering_info' | 'processing' | 'completed';
  lastActivity: Date;
  createdAt: Date;
}

export class ConversationContextManager {
  private contexts: Map<string, SessionContext> = new Map();
  private readonly maxContextEntries = 10;
  private readonly contextExpiryMinutes = 30;

  /**
   * Initialize or get existing conversation context for a session
   */
  getOrCreateContext(sessionId: string, userId: string): SessionContext {
    let context = this.contexts.get(sessionId);
    
    if (!context) {
      context = {
        sessionId,
        userId,
        entries: [],
        currentEntities: {},
        conversationState: 'initial',
        lastActivity: new Date(),
        createdAt: new Date()
      };
      this.contexts.set(sessionId, context);
      logger.info('Created new conversation context', { sessionId, userId });
    } else {
      // Update last activity
      context.lastActivity = new Date();
    }

    return context;
  }

  /**
   * Update context with new information
   */
  updateContext(sessionId: string, data: {
    userMessage: string;
    intent: string;
    entities: Record<string, any>;
    timestamp: Date;
  }): void {
    this.addEntry(sessionId, data.intent, data.entities, data.userMessage);
  }

  /**
   * Add a new entry to the conversation context
   */
  addEntry(
    sessionId: string,
    intent: string,
    entities: Record<string, any>,
    userMessage: string,
    botResponse?: string
  ): void {
    const context = this.contexts.get(sessionId);
    if (!context) {
      logger.warn('Attempted to add entry to non-existent context', { sessionId });
      return;
    }

    const entry: ContextEntry = {
      timestamp: new Date(),
      intent,
      entities,
      userMessage,
      botResponse
    };

    context.entries.push(entry);
    
    // Merge entities into current context
    this.mergeEntities(context, entities);
    
    // Update conversation state
    this.updateConversationState(context, intent, entities);
    
    // Trim old entries if needed
    if (context.entries.length > this.maxContextEntries) {
      context.entries = context.entries.slice(-this.maxContextEntries);
    }

    context.lastActivity = new Date();
    
    logger.debug('Added entry to conversation context', {
      sessionId,
      intent,
      entitiesCount: Object.keys(entities).length,
      totalEntries: context.entries.length
    });
  }

  /**
   * Update bot response for the latest entry
   */
  updateLatestResponse(sessionId: string, botResponse: string): void {
    const context = this.contexts.get(sessionId);
    if (!context || context.entries.length === 0) {
      return;
    }

    const latestEntry = context.entries[context.entries.length - 1];
    latestEntry.botResponse = botResponse;
    context.lastActivity = new Date();
  }

  /**
   * Get conversation context for NLP processing
   */
  getConversationContext(sessionId: string): ConversationContext | undefined {
    const context = this.contexts.get(sessionId);
    if (!context) {
      return undefined;
    }

    return {
      previousIntent: context.entries.length > 0 ? context.entries[context.entries.length - 1].intent : undefined,
      extractedEntities: { ...context.currentEntities },
      conversationHistory: context.entries.slice(-5).map(entry => entry.userMessage)
    };
  }

  /**
   * Get accumulated entities from the conversation
   */
  getAccumulatedEntities(sessionId: string): Record<string, any> {
    const context = this.contexts.get(sessionId);
    return context ? { ...context.currentEntities } : {};
  }

  /**
   * Check if enough information is gathered for a specific intent
   */
  hasRequiredEntities(sessionId: string, intent: string): boolean {
    const context = this.contexts.get(sessionId);
    if (!context) {
      return false;
    }

    const requiredEntities = this.getRequiredEntitiesForIntent(intent);
    return requiredEntities.every(entity => 
      context.currentEntities[entity] !== undefined
    );
  }

  /**
   * Get missing entities for a specific intent
   */
  getMissingEntities(sessionId: string, intent: string): string[] {
    const context = this.contexts.get(sessionId);
    if (!context) {
      return this.getRequiredEntitiesForIntent(intent);
    }

    const requiredEntities = this.getRequiredEntitiesForIntent(intent);
    return requiredEntities.filter(entity => 
      context.currentEntities[entity] === undefined
    );
  }

  /**
   * Generate clarification questions based on missing entities
   */
  generateClarificationQuestions(sessionId: string, intent: string): string[] {
    const missingEntities = this.getMissingEntities(sessionId, intent);
    const questions: string[] = [];

    for (const entity of missingEntities) {
      const question = this.getQuestionForEntity(entity, intent);
      if (question) {
        questions.push(question);
      }
    }

    return questions;
  }

  /**
   * Check if user is repeating the same question
   */
  isRepeatingQuestion(sessionId: string, userMessage: string): boolean {
    const context = this.contexts.get(sessionId);
    if (!context || context.entries.length < 2) {
      return false;
    }

    const normalizedMessage = this.normalizeMessage(userMessage);
    const recentMessages = context.entries.slice(-3).map(entry => 
      this.normalizeMessage(entry.userMessage)
    );

    return recentMessages.includes(normalizedMessage);
  }

  /**
   * Get conversation summary for context
   */
  getConversationSummary(sessionId: string): string {
    const context = this.contexts.get(sessionId);
    if (!context || context.entries.length === 0) {
      return 'Yeni konuşma başlatıldı.';
    }

    const recentEntries = context.entries.slice(-3);
    const summary = recentEntries.map(entry => {
      const entitySummary = Object.keys(entry.entities).length > 0 
        ? ` (${Object.keys(entry.entities).join(', ')} belirtildi)`
        : '';
      return `${entry.intent}${entitySummary}`;
    }).join(' → ');

    return `Son konuşma: ${summary}`;
  }

  /**
   * Clear context for a session
   */
  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
    logger.info('Cleared conversation context', { sessionId });
  }

  /**
   * Clean up expired contexts
   */
  cleanupExpiredContexts(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, context] of this.contexts.entries()) {
      const minutesSinceLastActivity = (now.getTime() - context.lastActivity.getTime()) / (1000 * 60);
      
      if (minutesSinceLastActivity > this.contextExpiryMinutes) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.contexts.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      logger.info('Cleaned up expired contexts', { 
        expiredCount: expiredSessions.length,
        remainingCount: this.contexts.size 
      });
    }
  }

  /**
   * Get context summary for a session
   */
  getContextSummary(sessionId: string): string {
    return this.getConversationSummary(sessionId);
  }

  /**
   * Get general statistics
   */
  getStats(): { totalSessions: number; averageEntries: number; oldestSession: Date | null } {
    return this.getContextStats();
  }

  /**
   * Get context statistics
   */
  getContextStats(): { totalSessions: number; averageEntries: number; oldestSession: Date | null } {
    const sessions = Array.from(this.contexts.values());
    
    return {
      totalSessions: sessions.length,
      averageEntries: sessions.length > 0 
        ? sessions.reduce((sum, ctx) => sum + ctx.entries.length, 0) / sessions.length 
        : 0,
      oldestSession: sessions.length > 0 
        ? new Date(Math.min(...sessions.map(ctx => ctx.createdAt.getTime())))
        : null
    };
  }

  /**
   * Merge new entities into current context
   */
  private mergeEntities(context: SessionContext, newEntities: Record<string, any>): void {
    for (const [key, value] of Object.entries(newEntities)) {
      if (value !== undefined && value !== null) {
        context.currentEntities[key] = value;
      }
    }
  }

  /**
   * Update conversation state based on intent and entities
   */
  private updateConversationState(
    context: SessionContext,
    intent: string,
    entities: Record<string, any>
  ): void {
    const requiredEntities = this.getRequiredEntitiesForIntent(intent);
    const hasAllEntities = requiredEntities.every(entity => 
      context.currentEntities[entity] !== undefined
    );

    if (context.conversationState === 'initial') {
      context.conversationState = 'gathering_info';
    }

    if (hasAllEntities && intent !== 'clarification_needed') {
      context.conversationState = 'processing';
    }

    if (intent === 'completed' || (hasAllEntities && context.entries.length > 1)) {
      context.conversationState = 'completed';
    }
  }

  /**
   * Get required entities for a specific intent
   */
  private getRequiredEntitiesForIntent(intent: string): string[] {
    const requirements: Record<string, string[]> = {
      net_calculation: ['university', 'department', 'scoreType'],
      base_score: ['university', 'department'],
      quota_inquiry: ['university', 'department'],
      department_search: ['university'],
      clarification_needed: []
    };

    return requirements[intent] || [];
  }

  /**
   * Get clarification question for a specific entity
   */
  private getQuestionForEntity(entity: string, intent: string): string | undefined {
    const questions: Record<string, Record<string, string>> = {
      net_calculation: {
        university: 'Hangi üniversiteyi merak ediyorsunuz?',
        department: 'Hangi bölüm için net hesaplama yapmak istiyorsunuz?',
        scoreType: 'Hangi puan türü için hesaplama yapmalıyım? (SAY, EA, SÖZ, DIL)'
      },
      base_score: {
        university: 'Hangi üniversitenin taban puanını öğrenmek istiyorsunuz?',
        department: 'Hangi bölümün taban puanını merak ediyorsunuz?'
      },
      quota_inquiry: {
        university: 'Hangi üniversitenin kontenjan bilgilerini istiyorsunuz?',
        department: 'Hangi bölümün kontenjan bilgilerini merak ediyorsunuz?'
      },
      department_search: {
        university: 'Hangi üniversitenin bölümlerini görmek istiyorsunuz?'
      }
    };

    return questions[intent]?.[entity];
  }

  /**
   * Normalize message for comparison
   */
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .replace(/[^\w\sçğıöşü]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
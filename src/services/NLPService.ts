import { IntentClassifier } from './IntentClassifier';
import { EntityExtractor } from './EntityExtractor';
import { ConversationContextManager } from './ConversationContextManager';
import { FollowUpHandler } from './FollowUpHandler';
import logger from '@/utils/logger';

export interface NLPRequest {
  text: string;
  userId: string;
  sessionId?: string;
  context?: any;
}

export interface NLPResponse {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  message: string;
  suggestions?: string[];
  clarificationNeeded?: boolean;
  followUpQuestions?: string[];
}

export class NLPService {
  private intentClassifier: IntentClassifier;
  private entityExtractor: EntityExtractor;
  private contextManager: ConversationContextManager;
  private followUpHandler: FollowUpHandler;

  constructor() {
    this.intentClassifier = new IntentClassifier();
    this.entityExtractor = new EntityExtractor();
    this.contextManager = new ConversationContextManager();
    this.followUpHandler = new FollowUpHandler(this.contextManager);
  }

  async processMessage(request: NLPRequest): Promise<NLPResponse> {
    try {
      logger.info('Processing NLP request', { 
        text: request.text.substring(0, 100),
        userId: request.userId 
      });

      // Classify intent
      const intent = await this.intentClassifier.classifyIntent(request.text);
      
      // Extract entities
      const entities = await this.entityExtractor.extractEntities(request.text, intent.keywords);
      
      // Update context if session exists
      if (request.sessionId) {
        this.contextManager.updateContext(request.sessionId, {
          userMessage: request.text,
          intent: intent.intent,
          entities,
          timestamp: new Date()
        });
      }

      // Generate response
      const message = this.generateResponse(intent.intent, entities);
      
      // Generate suggestions
      const suggestions = this.generateSuggestions(intent.intent, entities);

      const response: NLPResponse = {
        intent: intent.intent,
        entities,
        confidence: 0.8, // Default confidence
        message,
        suggestions
      };

      logger.info('NLP processing completed', { intent, entitiesCount: Object.keys(entities).length });
      
      return response;
    } catch (error) {
      logger.error('NLP processing failed:', error);
      
      return {
        intent: 'error',
        entities: {},
        confidence: 0,
        message: 'Üzgünüm, mesajınızı anlayamadım. Lütfen farklı bir şekilde ifade edebilir misiniz?',
        suggestions: [
          'Üniversite adını tam olarak yazın',
          'Bölüm adını belirtin',
          'Net sayılarınızı paylaşın'
        ]
      };
    }
  }

  private generateResponse(intent: string, entities: Record<string, any>): string {
    switch (intent) {
      case 'net_calculation':
        return this.generateNetCalculationResponse(entities);
      case 'base_score':
        return this.generateBaseScoreResponse(entities);
      case 'quota_inquiry':
        return this.generateQuotaResponse(entities);
      case 'department_search':
        return this.generateDepartmentSearchResponse(entities);
      case 'help':
        return this.generateHelpResponse();
      default:
        return 'Size nasıl yardımcı olabilirim? Üniversite tercihleri, net hesaplama veya bölüm bilgileri hakkında sorularınızı yanıtlayabilirim.';
    }
  }

  private generateNetCalculationResponse(entities: Record<string, any>): string {
    const university = entities.university || 'belirtilen üniversite';
    const department = entities.department || 'belirtilen bölüm';
    
    if (!entities.university || !entities.department) {
      return `Net hesaplama için üniversite ve bölüm bilgisi gerekiyor. Örneğin: "${university} ${department} için kaç net gerekir?" şeklinde sorabilirsiniz.`;
    }

    return `${university} ${department} bölümü için net hesaplama yapıyorum. Bu bölüm için genellikle TYT'de 80+ ve AYT'de 60+ net gerekir. Daha kesin bilgi için hedef puanınızı belirtebilirsiniz.`;
  }

  private generateBaseScoreResponse(entities: Record<string, any>): string {
    const university = entities.university || 'belirtilen üniversite';
    const department = entities.department || 'belirtilen bölüm';
    
    return `${university} ${department} bölümünün 2024 yılı taban puanı yaklaşık 400-450 arasındadır. Güncel ve kesin bilgi için YÖK Atlas'ı kontrol etmenizi öneririm.`;
  }

  private generateQuotaResponse(entities: Record<string, any>): string {
    const university = entities.university || 'belirtilen üniversite';
    const department = entities.department || 'belirtilen bölüm';
    
    return `${university} ${department} bölümünün kontenjan bilgisi için YÖK Atlas'tan güncel verileri kontrol edebilirim. Genellikle bu tür bölümlerin kontenjanı 100-200 arasında değişir.`;
  }

  private generateDepartmentSearchResponse(entities: Record<string, any>): string {
    const university = entities.university || 'belirtilen üniversite';
    
    return `${university} üniversitesindeki bölümler hakkında bilgi verebilirim. Hangi alan ile ilgileniyorsunuz? Mühendislik, tıp, sosyal bilimler gibi...`;
  }

  private generateHelpResponse(): string {
    return `Size şu konularda yardımcı olabilirim:

🎯 Net hesaplama ve puan tahmini
🏫 Üniversite ve bölüm bilgileri  
📊 Taban puanları ve kontenjanlar
💡 Tercih stratejileri

Örnek sorular:
• "İTÜ Bilgisayar Mühendisliği için kaç net gerekir?"
• "Matematik 25, Fen 20 net ile hangi bölümleri tercih edebilirim?"
• "Ankara'daki tıp fakültelerinin taban puanları nedir?"

Nasıl yardımcı olabilirim?`;
  }

  private generateSuggestions(intent: string, entities: Record<string, any>): string[] {
    const suggestions: string[] = [];
    
    switch (intent) {
      case 'net_calculation':
        suggestions.push(
          'Hedef puanınızı belirtin',
          'Hangi sınav türü? (SAY, EA, SÖZ)',
          'Geçmiş yıl verilerini göster'
        );
        break;
      case 'base_score':
        suggestions.push(
          'Kontenjan bilgisi',
          'Benzer bölümler',
          'Geçmiş yıl karşılaştırması'
        );
        break;
      default:
        suggestions.push(
          'Net hesaplama yap',
          'Bölüm öner',
          'Yardım al'
        );
    }
    
    return suggestions;
  }

  // Context management methods
  updateBotResponse(sessionId: string, botResponse: string): void {
    this.contextManager.updateLatestResponse(sessionId, botResponse);
  }

  getConversationSummary(sessionId: string): string {
    return this.contextManager.getContextSummary(sessionId);
  }

  clearConversationContext(sessionId: string): void {
    this.contextManager.clearContext(sessionId);
  }

  cleanupExpiredContexts(): void {
    this.contextManager.cleanupExpiredContexts();
  }

  getContextStats(): { totalSessions: number; averageEntries: number; oldestSession: Date | null } {
    return this.contextManager.getStats();
  }
}

export default NLPService;
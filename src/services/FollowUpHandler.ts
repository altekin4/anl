import { ConversationContextManager } from './ConversationContextManager';
import logger from '../utils/logger';

export interface FollowUpSuggestion {
  type: 'question' | 'action' | 'information';
  text: string;
  intent?: string;
  entities?: Record<string, any>;
  priority: number;
}

export class FollowUpHandler {
  private contextManager: ConversationContextManager;

  constructor(contextManager: ConversationContextManager) {
    this.contextManager = contextManager;
  }

  /**
   * Generate follow-up suggestions based on conversation context
   */
  generateFollowUpSuggestions(
    sessionId: string,
    currentIntent: string,
    currentEntities: Record<string, any>
  ): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];
    const accumulatedEntities = this.contextManager.getAccumulatedEntities(sessionId);
    
    try {
      // Generate suggestions based on current intent
      switch (currentIntent) {
        case 'net_calculation':
          suggestions.push(...this.generateNetCalculationFollowUps(accumulatedEntities));
          break;
        
        case 'base_score':
          suggestions.push(...this.generateBaseScoreFollowUps(accumulatedEntities));
          break;
        
        case 'quota_inquiry':
          suggestions.push(...this.generateQuotaFollowUps(accumulatedEntities));
          break;
        
        case 'department_search':
          suggestions.push(...this.generateDepartmentSearchFollowUps(accumulatedEntities));
          break;
        
        default:
          suggestions.push(...this.generateGeneralFollowUps());
      }

      // Add contextual suggestions based on accumulated entities
      suggestions.push(...this.generateContextualSuggestions(accumulatedEntities));

      // Sort by priority and return top suggestions
      return suggestions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 4);

    } catch (error) {
      logger.error('Error generating follow-up suggestions', { error, sessionId, currentIntent });
      return this.generateFallbackSuggestions();
    }
  }

  /**
   * Generate clarification follow-ups for incomplete information
   */
  generateClarificationFollowUps(
    sessionId: string,
    intent: string
  ): FollowUpSuggestion[] {
    const missingEntities = this.contextManager.getMissingEntities(sessionId, intent);
    const suggestions: FollowUpSuggestion[] = [];

    for (const entity of missingEntities) {
      const suggestion = this.createClarificationSuggestion(entity, intent);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Check if user needs help based on conversation pattern
   */
  shouldOfferHelp(sessionId: string, userMessage: string): boolean {
    // Check if user is repeating questions
    if (this.contextManager.isRepeatingQuestion(sessionId, userMessage)) {
      return true;
    }

    // Check if user seems confused (multiple clarification requests)
    const context = this.contextManager.getConversationContext(sessionId);
    if (context?.conversationHistory) {
      const clarificationCount = context.conversationHistory.filter(msg => 
        this.containsConfusionIndicators(msg)
      ).length;
      
      return clarificationCount >= 2;
    }

    return false;
  }

  /**
   * Generate help suggestions when user seems confused
   */
  generateHelpSuggestions(): FollowUpSuggestion[] {
    return [
      {
        type: 'information',
        text: 'Size nasıl yardımcı olabilirim? İşte yapabileceklerim:',
        priority: 10
      },
      {
        type: 'action',
        text: 'Net hesaplama yapmak için üniversite ve bölüm söyleyin',
        intent: 'net_calculation',
        priority: 9
      },
      {
        type: 'action',
        text: 'Taban puan öğrenmek için bölüm seçin',
        intent: 'base_score',
        priority: 8
      },
      {
        type: 'action',
        text: 'Kontenjan bilgisi için üniversite ve bölüm belirtin',
        intent: 'quota_inquiry',
        priority: 7
      }
    ];
  }

  /**
   * Generate follow-ups for net calculation results
   */
  private generateNetCalculationFollowUps(entities: Record<string, any>): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];

    if (entities.university && entities.department) {
      suggestions.push({
        type: 'question',
        text: `${entities.department} bölümünün taban puanını da merak ediyor musunuz?`,
        intent: 'base_score',
        entities: { university: entities.university, department: entities.department },
        priority: 8
      });

      suggestions.push({
        type: 'question',
        text: `${entities.department} bölümünün kontenjanını öğrenmek ister misiniz?`,
        intent: 'quota_inquiry',
        entities: { university: entities.university, department: entities.department },
        priority: 7
      });

      suggestions.push({
        type: 'action',
        text: 'Başka bir bölüm için de hesaplama yapabilirsiniz',
        intent: 'net_calculation',
        priority: 6
      });
    }

    if (entities.university) {
      suggestions.push({
        type: 'question',
        text: `${entities.university}'nde başka hangi bölümler var?`,
        intent: 'department_search',
        entities: { university: entities.university },
        priority: 5
      });
    }

    return suggestions;
  }

  /**
   * Generate follow-ups for base score inquiries
   */
  private generateBaseScoreFollowUps(entities: Record<string, any>): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];

    if (entities.university && entities.department) {
      suggestions.push({
        type: 'question',
        text: `${entities.department} için kaç net gerekli?`,
        intent: 'net_calculation',
        entities: { university: entities.university, department: entities.department },
        priority: 9
      });

      suggestions.push({
        type: 'question',
        text: `${entities.department} bölümünün kontenjanı kaç kişi?`,
        intent: 'quota_inquiry',
        entities: { university: entities.university, department: entities.department },
        priority: 7
      });
    }

    suggestions.push({
      type: 'action',
      text: 'Başka bir bölümün taban puanını da sorgulayabilirsiniz',
      intent: 'base_score',
      priority: 6
    });

    return suggestions;
  }

  /**
   * Generate follow-ups for quota inquiries
   */
  private generateQuotaFollowUps(entities: Record<string, any>): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];

    if (entities.university && entities.department) {
      suggestions.push({
        type: 'question',
        text: `${entities.department} için net hesaplama yapalım mı?`,
        intent: 'net_calculation',
        entities: { university: entities.university, department: entities.department },
        priority: 8
      });

      suggestions.push({
        type: 'question',
        text: `${entities.department} bölümünün taban puanı nedir?`,
        intent: 'base_score',
        entities: { university: entities.university, department: entities.department },
        priority: 7
      });
    }

    return suggestions;
  }

  /**
   * Generate follow-ups for department search
   */
  private generateDepartmentSearchFollowUps(entities: Record<string, any>): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];

    if (entities.university) {
      suggestions.push({
        type: 'action',
        text: 'İlginizi çeken bir bölüm için net hesaplama yapabiliriz',
        intent: 'net_calculation',
        entities: { university: entities.university },
        priority: 8
      });

      suggestions.push({
        type: 'action',
        text: 'Bölümlerin taban puanlarını karşılaştırabilirsiniz',
        intent: 'base_score',
        entities: { university: entities.university },
        priority: 7
      });
    }

    return suggestions;
  }

  /**
   * Generate contextual suggestions based on accumulated entities
   */
  private generateContextualSuggestions(entities: Record<string, any>): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];

    // If user has shown interest in engineering
    if (this.hasEngineeringInterest(entities)) {
      suggestions.push({
        type: 'information',
        text: 'Mühendislik bölümleri genellikle SAY puan türünden öğrenci alır',
        priority: 4
      });
    }

    // If user has shown interest in social sciences
    if (this.hasSocialScienceInterest(entities)) {
      suggestions.push({
        type: 'information',
        text: 'Sosyal bilimler bölümleri EA veya SÖZ puan türünden öğrenci alır',
        priority: 4
      });
    }

    // If user has language preference
    if (entities.language && entities.language.includes('İngilizce')) {
      suggestions.push({
        type: 'information',
        text: 'İngilizce bölümler genellikle daha yüksek puan ister',
        priority: 3
      });
    }

    return suggestions;
  }

  /**
   * Generate general follow-up suggestions
   */
  private generateGeneralFollowUps(): FollowUpSuggestion[] {
    return [
      {
        type: 'action',
        text: 'Net hesaplama yapmak için üniversite ve bölüm belirtin',
        intent: 'net_calculation',
        priority: 6
      },
      {
        type: 'action',
        text: 'Taban puan sorgulamak için bölüm seçin',
        intent: 'base_score',
        priority: 5
      },
      {
        type: 'action',
        text: 'Üniversite bölümlerini keşfedin',
        intent: 'department_search',
        priority: 4
      }
    ];
  }

  /**
   * Create clarification suggestion for missing entity
   */
  private createClarificationSuggestion(entity: string, intent: string): FollowUpSuggestion | null {
    const questions: Record<string, string> = {
      university: 'Hangi üniversiteyi merak ediyorsunuz?',
      department: 'Hangi bölüm hakkında bilgi almak istiyorsunuz?',
      scoreType: 'Hangi puan türü için bilgi istiyorsunuz?',
      language: 'Türkçe mi İngilizce mi öğretim dili tercih ediyorsunuz?'
    };

    const questionText = questions[entity];
    if (!questionText) {
      return null;
    }

    return {
      type: 'question',
      text: questionText,
      intent: 'clarification_needed',
      priority: 10
    };
  }

  /**
   * Generate fallback suggestions when error occurs
   */
  private generateFallbackSuggestions(): FollowUpSuggestion[] {
    return [
      {
        type: 'action',
        text: 'Yeni bir soru sorabilirsiniz',
        priority: 5
      },
      {
        type: 'information',
        text: 'Size nasıl yardımcı olabilirim?',
        priority: 4
      }
    ];
  }

  /**
   * Check if user has shown interest in engineering
   */
  private hasEngineeringInterest(entities: Record<string, any>): boolean {
    const engineeringKeywords = [
      'mühendislik', 'bilgisayar', 'elektrik', 'makine', 'endüstri', 'inşaat'
    ];
    
    const department = entities.department?.toLowerCase() || '';
    return engineeringKeywords.some(keyword => department.includes(keyword));
  }

  /**
   * Check if user has shown interest in social sciences
   */
  private hasSocialScienceInterest(entities: Record<string, any>): boolean {
    const socialScienceKeywords = [
      'hukuk', 'işletme', 'iktisat', 'psikoloji', 'sosyoloji', 'siyaset'
    ];
    
    const department = entities.department?.toLowerCase() || '';
    return socialScienceKeywords.some(keyword => department.includes(keyword));
  }

  /**
   * Check if message contains confusion indicators
   */
  private containsConfusionIndicators(message: string): boolean {
    const confusionIndicators = [
      'anlamadım', 'ne demek', 'nasıl', 'bilmiyorum', 'emin değilim',
      'karışık', 'zorlaştı', 'help', 'yardım'
    ];
    
    const lowerMessage = message.toLowerCase();
    return confusionIndicators.some(indicator => lowerMessage.includes(indicator));
  }
}
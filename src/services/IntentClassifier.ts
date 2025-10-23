import logger from '../utils/logger';

export interface IntentClassification {
  intent: string;
  confidence: number;
  keywords: string[];
}

export class IntentClassifier {
  // Intent patterns with Turkish keywords and their weights
  private readonly intentPatterns: Record<string, { keywords: string[], weight: number }[]> = {
    tyt_calculation: [
      { keywords: ['tyt', 'tyt net', 'tyt hesapla', 'tyt hesaplama'], weight: 1.0 },
      { keywords: ['temel yeterlilik', 'temel yeterlilik testi'], weight: 0.9 },
      { keywords: ['tyt türkçe', 'tyt matematik', 'tyt fen', 'tyt sosyal'], weight: 0.8 },
      { keywords: ['tyt netim', 'tyt puanım'], weight: 0.9 }
    ],
    ayt_calculation: [
      { keywords: ['ayt', 'ayt net', 'ayt hesapla', 'ayt hesaplama'], weight: 1.0 },
      { keywords: ['alan yeterlilik', 'alan yeterlilik testi'], weight: 0.9 },
      { keywords: ['ayt say', 'ayt ea', 'ayt söz', 'ayt dil'], weight: 0.8 },
      { keywords: ['sayısal', 'eşit ağırlık', 'sözel'], weight: 0.7 },
      { keywords: ['ayt matematik', 'ayt fizik', 'ayt kimya', 'ayt biyoloji'], weight: 0.8 }
    ],
    study_advice: [
      { keywords: ['tavsiye', 'öneri', 'advice', 'suggestion'], weight: 1.0 },
      { keywords: ['nasıl çalışmalı', 'çalışma yöntemi', 'study method'], weight: 0.9 },
      { keywords: ['başarılı öğrenci', 'deneyim', 'experience'], weight: 0.8 },
      { keywords: ['motivasyon', 'motivation', 'ilham'], weight: 0.7 },
      { keywords: ['strateji', 'plan', 'strategy'], weight: 0.6 }
    ],
    net_calculation: [
      { keywords: ['net', 'kaç net', 'net sayısı', 'net hesapla', 'net gerekli'], weight: 1.0 },
      { keywords: ['kaç soru', 'soru sayısı', 'doğru sayısı'], weight: 0.9 },
      { keywords: ['hesapla', 'hesaplama', 'calculate'], weight: 0.8 },
      { keywords: ['gerekli', 'lazım', 'need', 'required'], weight: 0.7 },
      { keywords: ['yapmalı', 'yapmalıyım', 'should'], weight: 0.6 }
    ],
    base_score: [
      { keywords: ['taban puan', 'base score', 'minimum puan'], weight: 1.0 },
      { keywords: ['geçen sene', 'geçen yıl', 'last year'], weight: 0.9 },
      { keywords: ['puan', 'score', 'point'], weight: 0.8 },
      { keywords: ['kaç puan', 'ne kadar puan', 'how many points'], weight: 0.9 },
      { keywords: ['en düşük', 'minimum', 'lowest'], weight: 0.7 }
    ],
    quota_inquiry: [
      { keywords: ['kontenjan', 'quota', 'capacity'], weight: 1.0 },
      { keywords: ['kaç kişi', 'öğrenci sayısı', 'how many students'], weight: 0.9 },
      { keywords: ['kapasite', 'alım sayısı', 'intake'], weight: 0.8 },
      { keywords: ['yer', 'slot', 'position'], weight: 0.7 }
    ],
    department_search: [
      { keywords: ['bölüm', 'department', 'program'], weight: 1.0 },
      { keywords: ['hangi bölümler', 'which departments', 'what programs'], weight: 0.9 },
      { keywords: ['bölüm listesi', 'department list'], weight: 0.8 },
      { keywords: ['ne okumalı', 'what to study', 'hangi alan'], weight: 0.7 },
      { keywords: ['seçenek', 'option', 'choice'], weight: 0.6 }
    ],
    greeting: [
      { keywords: ['merhaba', 'hello', 'hi', 'selam'], weight: 1.0 },
      { keywords: ['iyi günler', 'good day', 'günaydın'], weight: 0.9 },
      { keywords: ['nasılsın', 'how are you', 'naber'], weight: 0.8 }
    ],
    help: [
      { keywords: ['yardım', 'help', 'nasıl', 'how'], weight: 1.0 },
      { keywords: ['ne yapabilirim', 'what can i do', 'neler yapabilir'], weight: 0.9 },
      { keywords: ['kullanım', 'usage', 'guide'], weight: 0.8 }
    ],
    thanks: [
      { keywords: ['teşekkür', 'thank', 'sağol'], weight: 1.0 },
      { keywords: ['teşekkürler', 'thanks', 'merci'], weight: 0.9 }
    ]
  };

  // Context-based intent modifiers
  private readonly contextModifiers: Record<string, number> = {
    'university_mentioned': 0.2,
    'department_mentioned': 0.2,
    'score_type_mentioned': 0.15,
    'numeric_value_mentioned': 0.1
  };

  // Question words that indicate information seeking
  private readonly questionWords = [
    'ne', 'nedir', 'nasıl', 'neden', 'niçin', 'kim', 'kime', 'kimi',
    'hangi', 'hangisi', 'kaç', 'kaçta', 'nerede', 'nereden', 'nereye',
    'ne zaman', 'when', 'what', 'how', 'why', 'who', 'which', 'where'
  ];

  /**
   * Classify intent from Turkish text with context awareness
   */
  classifyIntent(text: string, entities: Record<string, any> = {}): IntentClassification {
    const normalizedText = this.normalizeText(text);
    const words = normalizedText.split(/\s+/);
    
    logger.debug('Classifying intent', { text: normalizedText, entities });

    // Calculate scores for each intent
    const intentScores: Record<string, { score: number, matchedKeywords: string[] }> = {};

    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      let totalScore = 0;
      const matchedKeywords: string[] = [];

      for (const pattern of patterns) {
        const keywordScore = this.calculateKeywordScore(normalizedText, pattern.keywords);
        if (keywordScore > 0) {
          totalScore += keywordScore * pattern.weight;
          matchedKeywords.push(...pattern.keywords.filter(keyword => 
            normalizedText.includes(keyword.toLowerCase())
          ));
        }
      }

      // Apply context modifiers
      totalScore += this.calculateContextScore(entities);

      intentScores[intent] = {
        score: totalScore,
        matchedKeywords: [...new Set(matchedKeywords)]
      };
    }

    // Find the best intent
    const bestIntent = Object.entries(intentScores)
      .sort(([, a], [, b]) => b.score - a.score)[0];

    if (!bestIntent || bestIntent[1].score === 0) {
      return this.handleUnknownIntent(normalizedText, entities);
    }

    const [intent, { score, matchedKeywords }] = bestIntent;
    const confidence = Math.min(score / 2, 1.0); // Normalize confidence

    logger.debug('Intent classified', { 
      intent, 
      confidence, 
      matchedKeywords,
      allScores: Object.fromEntries(
        Object.entries(intentScores).map(([k, v]) => [k, v.score])
      )
    });

    return {
      intent,
      confidence,
      keywords: matchedKeywords
    };
  }

  /**
   * Calculate keyword matching score
   */
  private calculateKeywordScore(text: string, keywords: string[]): number {
    let score = 0;
    const words = text.split(/\s+/);

    for (const keyword of keywords) {
      const keywordWords = keyword.toLowerCase().split(/\s+/);
      
      if (keywordWords.length === 1) {
        // Single word keyword
        if (words.includes(keywordWords[0])) {
          score += 1;
        } else if (words.some(word => word.includes(keywordWords[0]))) {
          score += 0.5; // Partial match
        }
      } else {
        // Multi-word keyword
        if (text.includes(keyword.toLowerCase())) {
          score += keywordWords.length; // Higher score for phrase matches
        } else {
          // Check for partial phrase matches
          const matchedWords = keywordWords.filter(kw => words.includes(kw));
          score += matchedWords.length * 0.3;
        }
      }
    }

    return score;
  }

  /**
   * Calculate context-based score modifiers
   */
  private calculateContextScore(entities: Record<string, any>): number {
    let contextScore = 0;

    if (entities.university) {
      contextScore += this.contextModifiers.university_mentioned;
    }
    if (entities.department) {
      contextScore += this.contextModifiers.department_mentioned;
    }
    if (entities.scoreType) {
      contextScore += this.contextModifiers.score_type_mentioned;
    }
    if (entities.targetScore) {
      contextScore += this.contextModifiers.numeric_value_mentioned;
    }

    return contextScore;
  }

  /**
   * Handle cases where no clear intent is detected
   */
  private handleUnknownIntent(text: string, entities: Record<string, any>): IntentClassification {
    // Check if it's a question
    const isQuestion = this.isQuestion(text);
    
    // If entities are present, try to infer intent
    if (entities.university && entities.department) {
      return {
        intent: 'net_calculation',
        confidence: 0.6,
        keywords: ['inferred from entities']
      };
    }

    if (entities.university && !entities.department) {
      return {
        intent: 'department_search',
        confidence: 0.6,
        keywords: ['inferred from entities']
      };
    }

    if (isQuestion) {
      return {
        intent: 'clarification_needed',
        confidence: 0.7,
        keywords: ['question detected']
      };
    }

    // Default to clarification needed
    return {
      intent: 'clarification_needed',
      confidence: 0.5,
      keywords: []
    };
  }

  /**
   * Check if the text is a question
   */
  private isQuestion(text: string): boolean {
    // Check for question marks
    if (text.includes('?')) {
      return true;
    }

    // Check for question words
    const words = text.toLowerCase().split(/\s+/);
    return this.questionWords.some(qw => 
      words.includes(qw) || words.some(word => word.startsWith(qw))
    );
  }

  /**
   * Normalize Turkish text for processing
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\sçğıöşü]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get intent suggestions based on current context
   */
  getIntentSuggestions(entities: Record<string, any>): string[] {
    const suggestions: string[] = [];

    if (entities.university && entities.department) {
      suggestions.push(
        'Bu bölüm için kaç net gerekli?',
        'Taban puanı nedir?',
        'Kontenjanı kaç kişi?'
      );
    } else if (entities.university) {
      suggestions.push(
        'Hangi bölümler var?',
        'En popüler bölümler neler?'
      );
    } else {
      suggestions.push(
        'Hangi üniversiteyi merak ediyorsunuz?',
        'Net hesaplama nasıl yapılır?',
        'Taban puan sorgulama nasıl yapılır?'
      );
    }

    return suggestions;
  }

  /**
   * Validate intent classification result
   */
  validateClassification(classification: IntentClassification, entities: Record<string, any>): boolean {
    // Check if intent makes sense with available entities
    switch (classification.intent) {
      case 'net_calculation':
        return classification.confidence > 0.5 || (entities.university && entities.department);
      
      case 'base_score':
      case 'quota_inquiry':
        return classification.confidence > 0.4 || entities.university;
      
      case 'department_search':
        return classification.confidence > 0.4;
      
      default:
        return classification.confidence > 0.3;
    }
  }
}
import { IntentClassifier } from '../IntentClassifier';

describe('IntentClassifier', () => {
  let intentClassifier: IntentClassifier;

  beforeEach(() => {
    intentClassifier = new IntentClassifier();
  });

  describe('classifyIntent', () => {
    it('should classify net calculation intent correctly', () => {
      const testCases = [
        'kaç net gerekli',
        'net hesaplama yapabilir misin',
        'kaç soru doğru yapmalıyım',
        'net sayısı nedir'
      ];

      testCases.forEach(text => {
        const result = intentClassifier.classifyIntent(text);
        expect(result.intent).toBe('net_calculation');
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.keywords.length).toBeGreaterThan(0);
      });
    });

    it('should classify base score intent correctly', () => {
      const testCases = [
        'taban puan nedir',
        'geçen sene kaç puan',
        'minimum puan ne kadar',
        'base score nedir'
      ];

      testCases.forEach(text => {
        const result = intentClassifier.classifyIntent(text);
        expect(result.intent).toBe('base_score');
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    it('should classify quota inquiry intent correctly', () => {
      const testCases = [
        'kontenjan kaç kişi',
        'kaç öğrenci alıyor',
        'kapasite nedir',
        'quota ne kadar'
      ];

      testCases.forEach(text => {
        const result = intentClassifier.classifyIntent(text);
        expect(result.intent).toBe('quota_inquiry');
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    it('should classify department search intent correctly', () => {
      const testCases = [
        'hangi bölümler var',
        'bölüm listesi',
        'ne okumalı',
        'department list'
      ];

      testCases.forEach(text => {
        const result = intentClassifier.classifyIntent(text);
        expect(result.intent).toBe('department_search');
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    it('should classify greeting intent correctly', () => {
      const testCases = [
        'merhaba',
        'hello',
        'selam',
        'iyi günler'
      ];

      testCases.forEach(text => {
        const result = intentClassifier.classifyIntent(text);
        expect(result.intent).toBe('greeting');
        expect(result.confidence).toBeGreaterThan(0.7);
      });
    });

    it('should classify help intent correctly', () => {
      const testCases = [
        'yardım',
        'help',
        'nasıl kullanırım',
        'ne yapabilirim'
      ];

      testCases.forEach(text => {
        const result = intentClassifier.classifyIntent(text);
        expect(result.intent).toBe('help');
        expect(result.confidence).toBeGreaterThan(0.6);
      });
    });

    it('should use entity context to improve classification', () => {
      const text = 'bilgi istiyorum';
      const entities = {
        university: 'Marmara Üniversitesi',
        department: 'Bilgisayar Mühendisliği'
      };

      const result = intentClassifier.classifyIntent(text, entities);
      
      // Should infer net_calculation from entities
      expect(result.intent).toBe('net_calculation');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle ambiguous text with clarification_needed', () => {
      const ambiguousTexts = [
        'bilgi',
        'ne',
        'hmm',
        'evet'
      ];

      ambiguousTexts.forEach(text => {
        const result = intentClassifier.classifyIntent(text);
        expect(result.intent).toBe('clarification_needed');
      });
    });

    it('should detect questions correctly', () => {
      const questions = [
        'ne kadar puan gerekli?',
        'hangi üniversite',
        'nasıl hesaplanır',
        'kim yardım edebilir'
      ];

      questions.forEach(question => {
        const result = intentClassifier.classifyIntent(question);
        expect(result.confidence).toBeGreaterThan(0.4);
      });
    });
  });

  describe('getIntentSuggestions', () => {
    it('should provide relevant suggestions based on entities', () => {
      const entities = {
        university: 'Marmara Üniversitesi',
        department: 'Bilgisayar Mühendisliği'
      };

      const suggestions = intentClassifier.getIntentSuggestions(entities);
      
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toContain('kaç net');
      expect(suggestions[1]).toContain('Taban puan');
      expect(suggestions[2]).toContain('Kontenjan');
    });

    it('should provide university-specific suggestions', () => {
      const entities = { university: 'Boğaziçi Üniversitesi' };
      const suggestions = intentClassifier.getIntentSuggestions(entities);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('bölüm'))).toBe(true);
    });

    it('should provide general suggestions when no entities', () => {
      const suggestions = intentClassifier.getIntentSuggestions({});
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('üniversite'))).toBe(true);
    });
  });

  describe('validateClassification', () => {
    it('should validate high-confidence classifications', () => {
      const classification = {
        intent: 'net_calculation',
        confidence: 0.8,
        keywords: ['net', 'hesaplama']
      };
      const entities = { university: 'Test Uni', department: 'Test Dept' };

      const isValid = intentClassifier.validateClassification(classification, entities);
      expect(isValid).toBe(true);
    });

    it('should validate entity-supported classifications', () => {
      const classification = {
        intent: 'net_calculation',
        confidence: 0.4,
        keywords: []
      };
      const entities = { university: 'Test Uni', department: 'Test Dept' };

      const isValid = intentClassifier.validateClassification(classification, entities);
      expect(isValid).toBe(true);
    });

    it('should reject low-confidence classifications without entity support', () => {
      const classification = {
        intent: 'net_calculation',
        confidence: 0.2,
        keywords: []
      };
      const entities = {};

      const isValid = intentClassifier.validateClassification(classification, entities);
      expect(isValid).toBe(false);
    });
  });
});
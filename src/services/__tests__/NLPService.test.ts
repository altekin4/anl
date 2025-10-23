import { NLPService } from '../NLPService';
import { DataService } from '../DataService';
import { FuzzyMatcher } from '../FuzzyMatcher';
import { NLPRequest, OpenAIConfig } from '../../types';

// Mock dependencies
jest.mock('../DataService');
jest.mock('../FuzzyMatcher');
jest.mock('../OpenAIService');

describe('NLPService', () => {
  let nlpService: NLPService;
  let mockDataService: jest.Mocked<DataService>;
  let mockFuzzyMatcher: jest.Mocked<FuzzyMatcher>;
  
  const mockOpenAIConfig: OpenAIConfig = {
    apiKey: 'test-key',
    model: 'gpt-3.5-turbo',
    maxTokens: 500,
    temperature: 0.7
  };

  beforeEach(() => {
    mockDataService = new DataService({} as any, {} as any) as jest.Mocked<DataService>;
    mockFuzzyMatcher = {} as jest.Mocked<FuzzyMatcher>;
    
    // Mock DataService methods
    mockDataService.searchUniversities = jest.fn().mockResolvedValue([
      { id: 1, name: 'Marmara Üniversitesi', city: 'İstanbul', type: 'Devlet', aliases: [] }
    ]);
    mockDataService.searchDepartments = jest.fn().mockResolvedValue([
      { id: 1, universityId: 1, name: 'Bilgisayar Mühendisliği', faculty: 'Mühendislik', language: 'Türkçe', aliases: [] }
    ]);
    mockDataService.getUniversities = jest.fn().mockResolvedValue([]);
    mockDataService.getDepartments = jest.fn().mockResolvedValue([]);

    // Mock FuzzyMatcher static methods
    FuzzyMatcher.findBestMatch = jest.fn().mockReturnValue(null);

    nlpService = new NLPService(mockDataService, mockFuzzyMatcher, mockOpenAIConfig);
  });

  describe('processMessage', () => {
    it('should process a simple net calculation request', async () => {
      const request: NLPRequest = {
        text: 'Marmara Üniversitesi bilgisayar mühendisliği kaç net gerekli',
        userId: 'user123'
      };

      const response = await nlpService.processMessage(request);

      expect(response.intent).toBe('net_calculation');
      expect(response.entities.university).toBe('Marmara Üniversitesi');
      expect(response.entities.department).toBe('Bilgisayar Mühendisliği');
      expect(response.confidence).toBeGreaterThan(0.5);
    });

    it('should handle base score inquiries', async () => {
      const request: NLPRequest = {
        text: 'Boğaziçi Üniversitesi işletme taban puan',
        userId: 'user123'
      };

      mockDataService.searchUniversities.mockResolvedValue([
        { id: 2, name: 'Boğaziçi Üniversitesi', city: 'İstanbul', type: 'Devlet', aliases: [] }
      ]);
      mockDataService.searchDepartments.mockResolvedValue([
        { id: 2, universityId: 2, name: 'İşletme', faculty: 'İİBF', language: 'Türkçe', aliases: [] }
      ]);

      const response = await nlpService.processMessage(request);

      expect(response.intent).toBe('base_score');
      expect(response.entities.university).toBe('Boğaziçi Üniversitesi');
      expect(response.entities.department).toBe('İşletme');
    });

    it('should accumulate entities across conversation', async () => {
      const sessionId = 'session123';
      
      // First message with university
      const request1: NLPRequest = {
        text: 'Marmara Üniversitesi',
        userId: 'user123',
        context: { sessionId }
      };

      const response1 = await nlpService.processMessage(request1);
      expect(response1.entities.university).toBe('Marmara Üniversitesi');

      // Second message with department
      const request2: NLPRequest = {
        text: 'bilgisayar mühendisliği kaç net',
        userId: 'user123',
        context: { sessionId }
      };

      const response2 = await nlpService.processMessage(request2);
      expect(response2.entities.university).toBe('Marmara Üniversitesi');
      expect(response2.entities.department).toBe('Bilgisayar Mühendisliği');
      expect(response2.intent).toBe('net_calculation');
    });

    it('should generate clarification questions for incomplete requests', async () => {
      const request: NLPRequest = {
        text: 'kaç net gerekli',
        userId: 'user123'
      };

      const response = await nlpService.processMessage(request);

      expect(response.intent).toBe('net_calculation');
      expect(response.clarificationNeeded).toBeDefined();
      expect(response.clarificationNeeded!.length).toBeGreaterThan(0);
    });

    it('should handle greeting messages', async () => {
      const request: NLPRequest = {
        text: 'merhaba',
        userId: 'user123'
      };

      const response = await nlpService.processMessage(request);

      expect(response.intent).toBe('greeting');
      expect(response.confidence).toBeGreaterThan(0.7);
    });

    it('should handle help requests', async () => {
      const request: NLPRequest = {
        text: 'yardım',
        userId: 'user123'
      };

      const response = await nlpService.processMessage(request);

      expect(response.intent).toBe('help');
      expect(response.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('extractEntities', () => {
    it('should extract and validate university entities', async () => {
      const entities = await nlpService.extractEntities('Marmara Üniversitesi bilgisayar');

      expect(mockDataService.searchUniversities).toHaveBeenCalledWith('Marmara Üniversitesi');
      expect(entities.university).toBe('Marmara Üniversitesi');
    });

    it('should extract and validate department entities', async () => {
      const entities = await nlpService.extractEntities('bilgisayar mühendisliği');

      expect(mockDataService.searchDepartments).toHaveBeenCalledWith('Bilgisayar Mühendisliği');
      expect(entities.department).toBe('Bilgisayar Mühendisliği');
    });

    it('should extract score type entities', async () => {
      const entities = await nlpService.extractEntities('SAY puan türü');

      expect(entities.scoreType).toBe('SAY');
    });

    it('should extract language entities', async () => {
      const entities = await nlpService.extractEntities('%30 İngilizce');

      expect(entities.language).toBe('%30 İngilizce');
    });

    it('should extract target score from text', async () => {
      const entities = await nlpService.extractEntities('450 puan hedefliyorum');

      expect(entities.targetScore).toBe(450);
    });

    it('should handle text without entities', async () => {
      const entities = await nlpService.extractEntities('merhaba nasılsın');

      expect(Object.keys(entities)).toHaveLength(0);
    });
  });

  describe('generateEnhancedResponse', () => {
    it('should generate enhanced response for net calculation', async () => {
      const response = await nlpService.generateEnhancedResponse(
        'net_calculation',
        { university: 'Test Uni', department: 'Test Dept' },
        { targetScore: 450, requiredNets: { TYT: { min: 30, max: 35 } } }
      );

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should fallback to basic response on OpenAI error', async () => {
      // Mock OpenAI service to throw error
      const response = await nlpService.generateEnhancedResponse(
        'net_calculation',
        { university: 'Test Uni', department: 'Test Dept' }
      );

      expect(response).toContain('Test Uni');
      expect(response).toContain('Test Dept');
    });
  });

  describe('conversation context management', () => {
    it('should generate follow-up suggestions', async () => {
      const suggestions = await nlpService.generateFollowUpSuggestions(
        'session123',
        'net_calculation',
        { university: 'Test Uni', department: 'Test Dept' }
      );

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should check and offer help when needed', async () => {
      const help = await nlpService.checkAndOfferHelp('session123', 'anlamadım');

      expect(help).toBeDefined();
    });

    it('should update bot response in context', () => {
      expect(() => {
        nlpService.updateBotResponse('session123', 'Test response');
      }).not.toThrow();
    });

    it('should get conversation summary', () => {
      const summary = nlpService.getConversationSummary('session123');
      expect(typeof summary).toBe('string');
    });

    it('should clear conversation context', () => {
      expect(() => {
        nlpService.clearConversationContext('session123');
      }).not.toThrow();
    });

    it('should get context statistics', () => {
      const stats = nlpService.getContextStats();
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('averageEntries');
      expect(stats).toHaveProperty('oldestSession');
    });
  });

  describe('OpenAI integration', () => {
    it('should validate OpenAI configuration', () => {
      const isValid = nlpService.validateOpenAIConfig();
      expect(typeof isValid).toBe('boolean');
    });

    it('should test OpenAI connection', async () => {
      const isConnected = await nlpService.testOpenAIConnection();
      expect(typeof isConnected).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDataService.searchUniversities.mockRejectedValue(new Error('Database error'));

      const request: NLPRequest = {
        text: 'test university',
        userId: 'user123'
      };

      await expect(nlpService.processMessage(request)).rejects.toThrow();
    });

    it('should handle invalid input gracefully', async () => {
      const request: NLPRequest = {
        text: '',
        userId: 'user123'
      };

      const response = await nlpService.processMessage(request);
      expect(response).toBeDefined();
    });
  });
});
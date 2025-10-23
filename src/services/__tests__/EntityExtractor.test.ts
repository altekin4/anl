import { EntityExtractor } from '../EntityExtractor';

describe('EntityExtractor', () => {
  let entityExtractor: EntityExtractor;

  beforeEach(() => {
    entityExtractor = new EntityExtractor();
  });

  describe('extractEntities', () => {
    it('should extract university entities from Turkish text', () => {
      const text = 'Marmara Üniversitesi hakkında bilgi istiyorum';
      const entities = entityExtractor.extractEntities(text, ['university']);

      expect(entities).toHaveLength(1);
      expect(entities[0].entity).toBe('university');
      expect(entities[0].value).toContain('Marmara');
      expect(entities[0].confidence).toBeGreaterThan(0.7);
    });

    it('should extract university abbreviations', () => {
      const text = 'İTÜ bilgisayar mühendisliği';
      const entities = entityExtractor.extractEntities(text, ['university']);

      expect(entities).toHaveLength(1);
      expect(entities[0].entity).toBe('university');
      expect(entities[0].confidence).toBeGreaterThan(0.8);
    });

    it('should extract department entities', () => {
      const text = 'bilgisayar mühendisliği bölümü';
      const entities = entityExtractor.extractEntities(text, ['department']);

      expect(entities).toHaveLength(1);
      expect(entities[0].entity).toBe('department');
      expect(entities[0].value).toContain('bilgisayar');
      expect(entities[0].confidence).toBeGreaterThan(0.7);
    });

    it('should extract score type entities', () => {
      const text = 'SAY puan türü için hesaplama';
      const entities = entityExtractor.extractEntities(text, ['scoreType']);

      expect(entities).toHaveLength(1);
      expect(entities[0].entity).toBe('scoreType');
      expect(entities[0].value).toBe('SAY');
      expect(entities[0].confidence).toBeGreaterThan(0.9);
    });

    it('should extract language entities', () => {
      const text = '%30 İngilizce öğretim dili';
      const entities = entityExtractor.extractEntities(text, ['language']);

      expect(entities).toHaveLength(1);
      expect(entities[0].entity).toBe('language');
      expect(entities[0].value).toBe('%30 İngilizce');
      expect(entities[0].confidence).toBeGreaterThan(0.8);
    });

    it('should handle multiple entity types in one text', () => {
      const text = 'Boğaziçi Üniversitesi bilgisayar mühendisliği SAY';
      const entities = entityExtractor.extractEntities(text);

      expect(entities.length).toBeGreaterThan(2);
      
      const universityEntity = entities.find(e => e.entity === 'university');
      const departmentEntity = entities.find(e => e.entity === 'department');
      const scoreTypeEntity = entities.find(e => e.entity === 'scoreType');

      expect(universityEntity).toBeDefined();
      expect(departmentEntity).toBeDefined();
      expect(scoreTypeEntity).toBeDefined();
    });

    it('should return empty array for text without entities', () => {
      const text = 'merhaba nasılsın';
      const entities = entityExtractor.extractEntities(text);

      expect(entities).toHaveLength(0);
    });
  });

  describe('normalizeText', () => {
    it('should normalize Turkish text correctly', () => {
      const text = 'Merhaba! Nasılsın? İyi misin...';
      const normalized = entityExtractor.normalizeText(text);

      expect(normalized).toBe('merhaba nasılsın iyi misin');
    });

    it('should preserve Turkish characters', () => {
      const text = 'çğıöşü ÇĞIÖŞÜ';
      const normalized = entityExtractor.normalizeText(text);

      expect(normalized).toBe('çğıöşü çğiöşü');
    });
  });

  describe('toAscii', () => {
    it('should convert Turkish characters to ASCII', () => {
      const text = 'çğıöşü ÇĞIÖŞÜ';
      const ascii = entityExtractor.toAscii(text);

      expect(ascii).toBe('cgiosu CGIOSU');
    });
  });

  describe('expandAbbreviations', () => {
    it('should expand common Turkish abbreviations', () => {
      const text = 'bil müh üni';
      const expanded = entityExtractor.expandAbbreviations(text);

      expect(expanded).toContain('bilgisayar');
      expect(expanded).toContain('mühendisliği');
      expect(expanded).toContain('üniversitesi');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return high similarity for identical texts', () => {
      const similarity = entityExtractor.calculateSimilarity('test', 'test');
      expect(similarity).toBe(1.0);
    });

    it('should return high similarity for similar Turkish texts', () => {
      const similarity = entityExtractor.calculateSimilarity(
        'bilgisayar mühendisliği',
        'bilgisayar müh'
      );
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should return low similarity for different texts', () => {
      const similarity = entityExtractor.calculateSimilarity('test', 'completely different');
      expect(similarity).toBeLessThan(0.3);
    });

    it('should handle Turkish character variations', () => {
      const similarity = entityExtractor.calculateSimilarity('çğıöşü', 'cgiosu');
      expect(similarity).toBeGreaterThan(0.8);
    });
  });
});
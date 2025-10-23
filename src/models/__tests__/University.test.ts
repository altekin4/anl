import { University } from '../University';
import { ValidationError } from '@/utils/errors';

describe('University Model', () => {
  describe('constructor and validation', () => {
    it('should create a valid university', () => {
      const universityData = {
        id: 1,
        name: 'Marmara Üniversitesi',
        city: 'İstanbul',
        type: 'Devlet' as const,
        aliases: ['M.Ü.', 'Marmara'],
      };

      const university = new University(universityData);

      expect(university.id).toBe(1);
      expect(university.name).toBe('Marmara Üniversitesi');
      expect(university.city).toBe('İstanbul');
      expect(university.type).toBe('Devlet');
      expect(university.aliases).toEqual(['M.Ü.', 'Marmara']);
    });

    it('should throw ValidationError for empty name', () => {
      expect(() => {
        new University({ name: '' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for name exceeding 255 characters', () => {
      const longName = 'a'.repeat(256);
      expect(() => {
        new University({ name: longName });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid type', () => {
      expect(() => {
        new University({ name: 'Test', type: 'Invalid' as any });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for city exceeding 100 characters', () => {
      const longCity = 'a'.repeat(101);
      expect(() => {
        new University({ name: 'Test', city: longCity });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-array aliases', () => {
      expect(() => {
        new University({ name: 'Test', aliases: 'not-array' as any });
      }).toThrow(ValidationError);
    });
  });

  describe('alias management', () => {
    let university: University;

    beforeEach(() => {
      university = new University({
        name: 'Test University',
        aliases: ['TU'],
      });
    });

    it('should add new alias', () => {
      university.addAlias('Test Uni');
      expect(university.aliases).toContain('Test Uni');
    });

    it('should not add duplicate alias', () => {
      university.addAlias('TU');
      expect(university.aliases.filter(a => a === 'TU')).toHaveLength(1);
    });

    it('should throw ValidationError for empty alias', () => {
      expect(() => {
        university.addAlias('');
      }).toThrow(ValidationError);
    });

    it('should remove existing alias', () => {
      university.removeAlias('TU');
      expect(university.aliases).not.toContain('TU');
    });

    it('should check if alias exists', () => {
      expect(university.hasAlias('TU')).toBe(true);
      expect(university.hasAlias('NonExistent')).toBe(false);
    });
  });

  describe('query matching', () => {
    let university: University;

    beforeEach(() => {
      university = new University({
        name: 'Marmara Üniversitesi',
        aliases: ['M.Ü.', 'Marmara'],
      });
    });

    it('should match by name', () => {
      expect(university.matchesQuery('Marmara')).toBe(true);
      expect(university.matchesQuery('marmara')).toBe(true);
      expect(university.matchesQuery('MARMARA')).toBe(true);
    });

    it('should match by alias', () => {
      expect(university.matchesQuery('M.Ü.')).toBe(true);
      expect(university.matchesQuery('m.ü.')).toBe(true);
    });

    it('should not match unrelated query', () => {
      expect(university.matchesQuery('Boğaziçi')).toBe(false);
    });

    it('should handle partial matches', () => {
      expect(university.matchesQuery('Mar')).toBe(true);
      expect(university.matchesQuery('Üni')).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should convert to JSON correctly', () => {
      const university = new University({
        id: 1,
        name: 'Test University',
        city: 'Test City',
        type: 'Devlet',
        aliases: ['TU'],
      });

      const json = university.toJSON();

      expect(json).toEqual({
        id: 1,
        name: 'Test University',
        city: 'Test City',
        type: 'Devlet',
        aliases: ['TU'],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should create from database row', () => {
      const dbRow = {
        id: 1,
        name: 'Test University',
        city: 'Test City',
        type: 'Devlet',
        aliases: ['TU'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const university = University.fromDatabase(dbRow);

      expect(university.id).toBe(1);
      expect(university.name).toBe('Test University');
      expect(university.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
    });
  });
});
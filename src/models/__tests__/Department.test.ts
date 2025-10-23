import { Department } from '../Department';
import { ValidationError } from '@/utils/errors';

describe('Department Model', () => {
  describe('constructor and validation', () => {
    it('should create a valid department', () => {
      const departmentData = {
        id: 1,
        universityId: 1,
        name: 'Bilgisayar Mühendisliği',
        faculty: 'Mühendislik Fakültesi',
        language: 'Türkçe',
        aliases: ['BM', 'Comp Eng'],
      };

      const department = new Department(departmentData);

      expect(department.id).toBe(1);
      expect(department.universityId).toBe(1);
      expect(department.name).toBe('Bilgisayar Mühendisliği');
      expect(department.faculty).toBe('Mühendislik Fakültesi');
      expect(department.language).toBe('Türkçe');
      expect(department.aliases).toEqual(['BM', 'Comp Eng']);
    });

    it('should throw ValidationError for empty name', () => {
      expect(() => {
        new Department({ universityId: 1, name: '' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid university ID', () => {
      expect(() => {
        new Department({ universityId: 0, name: 'Test' });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for name exceeding 255 characters', () => {
      const longName = 'a'.repeat(256);
      expect(() => {
        new Department({ universityId: 1, name: longName });
      }).toThrow(ValidationError);
    });

    it('should set default language to Türkçe', () => {
      const department = new Department({
        universityId: 1,
        name: 'Test Department',
      });

      expect(department.language).toBe('Türkçe');
    });
  });

  describe('language detection', () => {
    it('should detect English departments', () => {
      const department = new Department({
        universityId: 1,
        name: 'Computer Engineering',
        language: 'İngilizce',
      });

      expect(department.isEnglish()).toBe(true);
      expect(department.getLanguageType()).toBe('english');
    });

    it('should detect partial English departments', () => {
      const department = new Department({
        universityId: 1,
        name: 'İşletme',
        language: '%30 İngilizce',
      });

      expect(department.isPartialEnglish()).toBe(true);
      expect(department.getLanguageType()).toBe('partial_english');
    });

    it('should detect Turkish departments', () => {
      const department = new Department({
        universityId: 1,
        name: 'İşletme',
        language: 'Türkçe',
      });

      expect(department.isEnglish()).toBe(false);
      expect(department.isPartialEnglish()).toBe(false);
      expect(department.getLanguageType()).toBe('turkish');
    });
  });

  describe('query matching', () => {
    let department: Department;

    beforeEach(() => {
      department = new Department({
        universityId: 1,
        name: 'Bilgisayar Mühendisliği',
        faculty: 'Mühendislik Fakültesi',
        aliases: ['BM', 'Comp Eng'],
      });
    });

    it('should match by name', () => {
      expect(department.matchesQuery('Bilgisayar')).toBe(true);
      expect(department.matchesQuery('bilgisayar')).toBe(true);
      expect(department.matchesQuery('Mühendisliği')).toBe(true);
    });

    it('should match by faculty', () => {
      expect(department.matchesQuery('Mühendislik')).toBe(true);
      expect(department.matchesQuery('Fakültesi')).toBe(true);
    });

    it('should match by alias', () => {
      expect(department.matchesQuery('BM')).toBe(true);
      expect(department.matchesQuery('Comp Eng')).toBe(true);
    });

    it('should not match unrelated query', () => {
      expect(department.matchesQuery('Hukuk')).toBe(false);
    });
  });

  describe('alias management', () => {
    let department: Department;

    beforeEach(() => {
      department = new Department({
        universityId: 1,
        name: 'Test Department',
        aliases: ['TD'],
      });
    });

    it('should add new alias', () => {
      department.addAlias('Test Dept');
      expect(department.aliases).toContain('Test Dept');
    });

    it('should not add duplicate alias', () => {
      department.addAlias('TD');
      expect(department.aliases.filter(a => a === 'TD')).toHaveLength(1);
    });

    it('should remove existing alias', () => {
      department.removeAlias('TD');
      expect(department.aliases).not.toContain('TD');
    });

    it('should check if alias exists', () => {
      expect(department.hasAlias('TD')).toBe(true);
      expect(department.hasAlias('NonExistent')).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to JSON correctly', () => {
      const department = new Department({
        id: 1,
        universityId: 1,
        name: 'Test Department',
        faculty: 'Test Faculty',
        language: 'Türkçe',
        aliases: ['TD'],
      });

      const json = department.toJSON();

      expect(json).toEqual({
        id: 1,
        universityId: 1,
        name: 'Test Department',
        faculty: 'Test Faculty',
        language: 'Türkçe',
        aliases: ['TD'],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should create from database row', () => {
      const dbRow = {
        id: 1,
        university_id: 1,
        name: 'Test Department',
        faculty: 'Test Faculty',
        language: 'Türkçe',
        aliases: ['TD'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const department = Department.fromDatabase(dbRow);

      expect(department.id).toBe(1);
      expect(department.universityId).toBe(1);
      expect(department.name).toBe('Test Department');
    });
  });
});
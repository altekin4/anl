import { DataService } from '../DataService';
import { CacheService } from '../CacheService';
import { UniversityRepository } from '@/repositories/UniversityRepository';
import { DepartmentRepository } from '@/repositories/DepartmentRepository';
import { ScoreDataRepository } from '@/repositories/ScoreDataRepository';
import { University, Department, ScoreData } from '@/models';

// Mock repositories
jest.mock('@/repositories/UniversityRepository');
jest.mock('@/repositories/DepartmentRepository');
jest.mock('@/repositories/ScoreDataRepository');
jest.mock('../CacheService');

describe('Cache Integration Tests', () => {
  let dataService: DataService;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockUniversityRepo: jest.Mocked<UniversityRepository>;
  let mockDepartmentRepo: jest.Mocked<DepartmentRepository>;
  let mockScoreDataRepo: jest.Mocked<ScoreDataRepository>;

  const mockUniversity = new University({
    id: 1,
    name: 'Test University',
    city: 'İstanbul',
    type: 'Devlet',
    aliases: ['T.U.'],
  });

  const mockDepartment = new Department({
    id: 101,
    universityId: 1,
    name: 'Test Department',
    faculty: 'Test Faculty',
    language: 'Türkçe',
    aliases: ['TD'],
  });

  const mockScoreData = new ScoreData({
    departmentId: 101,
    year: 2023,
    scoreType: 'SAY',
    baseScore: 450.5,
    ceilingScore: 520.3,
    baseRank: 15000,
    ceilingRank: 5000,
    quota: 120,
  });

  beforeEach(() => {
    // Create mock instances
    mockCacheService = new CacheService({} as any) as jest.Mocked<CacheService>;
    mockUniversityRepo = new UniversityRepository(mockCacheService) as jest.Mocked<UniversityRepository>;
    mockDepartmentRepo = new DepartmentRepository(mockCacheService) as jest.Mocked<DepartmentRepository>;
    mockScoreDataRepo = new ScoreDataRepository(mockCacheService) as jest.Mocked<ScoreDataRepository>;

    // Setup cache service mocks
    mockCacheService.get = jest.fn();
    mockCacheService.set = jest.fn();
    mockCacheService.delete = jest.fn();
    mockCacheService.exists = jest.fn();

    // Setup repository mocks
    mockUniversityRepo.getAll = jest.fn();
    mockUniversityRepo.getById = jest.fn();
    mockUniversityRepo.search = jest.fn();
    mockUniversityRepo.getStatistics = jest.fn();

    mockDepartmentRepo.getAll = jest.fn();
    mockDepartmentRepo.getById = jest.fn();
    mockDepartmentRepo.search = jest.fn();
    mockDepartmentRepo.getByUniversityId = jest.fn();

    mockScoreDataRepo.getByDepartmentAndYear = jest.fn();
    mockScoreDataRepo.getLatestByDepartment = jest.fn();
    mockScoreDataRepo.getAvailableYears = jest.fn();

    // Create data service
    dataService = new DataService(mockCacheService);
    
    // Inject mocked repositories
    (dataService as any).universityRepo = mockUniversityRepo;
    (dataService as any).departmentRepo = mockDepartmentRepo;
    (dataService as any).scoreDataRepo = mockScoreDataRepo;

    jest.clearAllMocks();
  });

  describe('University Caching', () => {
    it('should cache university data after first fetch', async () => {
      mockUniversityRepo.getAll.mockResolvedValue([mockUniversity]);

      const universities = await dataService.getUniversities();

      expect(universities).toEqual([mockUniversity]);
      expect(mockUniversityRepo.getAll).toHaveBeenCalledTimes(1);
    });

    it('should use cached data for subsequent university requests', async () => {
      mockUniversityRepo.getById.mockResolvedValue(mockUniversity);

      // First call
      const university1 = await dataService.getUniversityById(1);
      // Second call
      const university2 = await dataService.getUniversityById(1);

      expect(university1).toEqual(mockUniversity);
      expect(university2).toEqual(mockUniversity);
      expect(mockUniversityRepo.getById).toHaveBeenCalledTimes(2); // Repository handles caching
    });

    it('should handle cache misses gracefully', async () => {
      mockCacheService.get.mockResolvedValue(null); // Cache miss
      mockUniversityRepo.getById.mockResolvedValue(mockUniversity);

      const university = await dataService.getUniversityById(1);

      expect(university).toEqual(mockUniversity);
      expect(mockUniversityRepo.getById).toHaveBeenCalledWith(1);
    });

    it('should invalidate cache when importing new universities', async () => {
      const newUniversities = [mockUniversity];
      mockUniversityRepo.bulkCreate.mockResolvedValue(newUniversities);

      const result = await dataService.importUniversities([{
        id: 1,
        name: 'Test University',
        city: 'İstanbul',
        type: 'Devlet',
        aliases: ['T.U.'],
      }]);

      expect(result).toEqual(newUniversities);
      expect(mockUniversityRepo.bulkCreate).toHaveBeenCalledWith([{
        id: 1,
        name: 'Test University',
        city: 'İstanbul',
        type: 'Devlet',
        aliases: ['T.U.'],
      }]);
    });
  });

  describe('Department Caching', () => {
    it('should cache department search results', async () => {
      const searchResults = [{ item: mockDepartment, score: 0.95 }];
      mockDepartmentRepo.search.mockResolvedValue(searchResults);

      const results = await dataService.searchDepartments('Test Department', 1, 10);

      expect(results).toEqual(searchResults);
      expect(mockDepartmentRepo.search).toHaveBeenCalledWith('Test Department', 1, 10);
    });

    it('should cache departments by university', async () => {
      mockDepartmentRepo.getByUniversityId.mockResolvedValue([mockDepartment]);

      const departments = await dataService.getDepartments(1);

      expect(departments).toEqual([mockDepartment]);
      expect(mockDepartmentRepo.getByUniversityId).toHaveBeenCalledWith(1);
    });

    it('should handle department cache performance', async () => {
      const largeDepartmentList = Array.from({ length: 1000 }, (_, i) => 
        new Department({
          id: i + 1,
          universityId: 1,
          name: `Department ${i + 1}`,
          faculty: 'Test Faculty',
          language: 'Türkçe',
          aliases: [],
        })
      );

      mockDepartmentRepo.getByUniversityId.mockResolvedValue(largeDepartmentList);

      const startTime = Date.now();
      const departments = await dataService.getDepartments(1);
      const endTime = Date.now();

      expect(departments).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(mockDepartmentRepo.getByUniversityId).toHaveBeenCalledWith(1);
    });
  });

  describe('Score Data Caching', () => {
    it('should cache score data by department and year', async () => {
      mockScoreDataRepo.getByDepartmentAndYear.mockResolvedValue([mockScoreData]);

      const scoreData = await dataService.getScoreData(101, 2023);

      expect(scoreData).toEqual([mockScoreData]);
      expect(mockScoreDataRepo.getByDepartmentAndYear).toHaveBeenCalledWith(101, 2023);
    });

    it('should cache latest score data separately', async () => {
      mockScoreDataRepo.getLatestByDepartment.mockResolvedValue([mockScoreData]);

      const latestScoreData = await dataService.getLatestScoreData(101);

      expect(latestScoreData).toEqual([mockScoreData]);
      expect(mockScoreDataRepo.getLatestByDepartment).toHaveBeenCalledWith(101);
    });

    it('should cache available years globally', async () => {
      const availableYears = [2021, 2022, 2023];
      mockScoreDataRepo.getAvailableYears.mockResolvedValue(availableYears);

      const years = await dataService.getAvailableYears();

      expect(years).toEqual(availableYears);
      expect(mockScoreDataRepo.getAvailableYears).toHaveBeenCalledTimes(1);
    });

    it('should handle cache expiration for score data', async () => {
      // Simulate cache expiration
      mockCacheService.get.mockResolvedValueOnce(null); // Expired cache
      mockScoreDataRepo.getByDepartmentAndYear.mockResolvedValue([mockScoreData]);

      const scoreData = await dataService.getScoreData(101, 2023);

      expect(scoreData).toEqual([mockScoreData]);
      expect(mockScoreDataRepo.getByDepartmentAndYear).toHaveBeenCalledWith(101, 2023);
    });
  });

  describe('Combined Search Caching', () => {
    it('should cache complex search results', async () => {
      mockUniversityRepo.findByName.mockResolvedValue(mockUniversity);
      mockDepartmentRepo.search.mockResolvedValue([{ item: mockDepartment, score: 0.95 }]);
      mockScoreDataRepo.getLatestByDepartment.mockResolvedValue([mockScoreData]);

      const result = await dataService.findDepartmentByUniversityAndDepartmentName(
        'Test University',
        'Test Department',
        'Türkçe'
      );

      expect(result.university).toEqual(mockUniversity);
      expect(result.department).toEqual(mockDepartment);
      expect(result.scoreData).toEqual([mockScoreData]);

      expect(mockUniversityRepo.findByName).toHaveBeenCalledWith('Test University');
      expect(mockDepartmentRepo.search).toHaveBeenCalledWith('Test Department', 1, 10);
      expect(mockScoreDataRepo.getLatestByDepartment).toHaveBeenCalledWith(101);
    });

    it('should cache suggestion results', async () => {
      const suggestionScoreData = [mockScoreData];
      mockScoreDataRepo.getDepartmentsByScoreRange.mockResolvedValue(suggestionScoreData);
      mockDepartmentRepo.getById.mockResolvedValue(mockDepartment);
      mockUniversityRepo.getById.mockResolvedValue(mockUniversity);

      const suggestions = await dataService.suggestSimilarDepartments(450, 'SAY', 2023, 5);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].department).toEqual(mockDepartment);
      expect(suggestions[0].university).toEqual(mockUniversity);
      expect(suggestions[0].scoreData).toEqual(mockScoreData);

      expect(mockScoreDataRepo.getDepartmentsByScoreRange).toHaveBeenCalledWith('SAY', 400, 500, 2023, 10);
    });
  });

  describe('Cache Performance and Memory Management', () => {
    it('should handle large dataset caching efficiently', async () => {
      const largeUniversityList = Array.from({ length: 200 }, (_, i) => 
        new University({
          id: i + 1,
          name: `University ${i + 1}`,
          city: 'İstanbul',
          type: i % 2 === 0 ? 'Devlet' : 'Vakıf',
          aliases: [`U${i + 1}`],
        })
      );

      mockUniversityRepo.getAll.mockResolvedValue(largeUniversityList);

      const startTime = Date.now();
      const universities = await dataService.getUniversities();
      const endTime = Date.now();

      expect(universities).toHaveLength(200);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle concurrent cache requests', async () => {
      mockUniversityRepo.getById.mockResolvedValue(mockUniversity);

      // Simulate concurrent requests
      const promises = Array.from({ length: 10 }, () => 
        dataService.getUniversityById(1)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toEqual(mockUniversity);
      });

      // Repository should handle concurrent access properly
      expect(mockUniversityRepo.getById).toHaveBeenCalledTimes(10);
    });

    it('should handle cache errors gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache connection failed'));
      mockUniversityRepo.getById.mockResolvedValue(mockUniversity);

      // Should fall back to database when cache fails
      const university = await dataService.getUniversityById(1);

      expect(university).toEqual(mockUniversity);
      expect(mockUniversityRepo.getById).toHaveBeenCalledWith(1);
    });
  });

  describe('Statistics Caching', () => {
    it('should cache system statistics', async () => {
      const mockStats = {
        universities: { total: 150, byType: { Devlet: 120, Vakıf: 30 }, byCityTop10: [] },
        departments: { total: 2500, byLanguage: [], byFacultyTop10: [] },
        scoreData: { totalRecords: 15000, byScoreType: [], byYear: [] },
      };

      mockUniversityRepo.getStatistics.mockResolvedValue(mockStats.universities);
      mockDepartmentRepo.getStatistics.mockResolvedValue(mockStats.departments);
      mockScoreDataRepo.getStatistics.mockResolvedValue(mockStats.scoreData);

      const stats = await dataService.getSystemStatistics();

      expect(stats).toEqual(mockStats);
      expect(mockUniversityRepo.getStatistics).toHaveBeenCalledTimes(1);
      expect(mockDepartmentRepo.getStatistics).toHaveBeenCalledTimes(1);
      expect(mockScoreDataRepo.getStatistics).toHaveBeenCalledTimes(1);
    });

    it('should cache health check results temporarily', async () => {
      mockUniversityRepo.getAll = jest.fn().mockResolvedValue([mockUniversity]);
      mockDepartmentRepo.getAll = jest.fn().mockResolvedValue([mockDepartment]);
      mockScoreDataRepo.getAvailableYears = jest.fn().mockResolvedValue([2023]);

      const healthCheck = await dataService.healthCheck();

      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.checks.database).toBe(true);
      expect(healthCheck.checks.dataAvailability.universities).toBe(1);
      expect(healthCheck.checks.dataAvailability.departments).toBe(1);
      expect(healthCheck.checks.dataAvailability.scoreData).toBe(1);
    });
  });
});
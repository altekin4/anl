import { DataImportService, ImportProgress, ImportResult } from '../DataImportService';
import { YokAtlasImporter } from '../YokAtlasImporter';
import { DataService } from '../DataService';
import { CacheService } from '../CacheService';
import { University, Department, ScoreData } from '@/models';

// Mock external dependencies
jest.mock('../YokAtlasImporter');
jest.mock('../DataService');
jest.mock('../CacheService');

describe('DataImportService Integration Tests', () => {
  let dataImportService: DataImportService;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockYokAtlasImporter: jest.Mocked<YokAtlasImporter>;
  let mockDataService: jest.Mocked<DataService>;

  const mockUniversities: University[] = [
    new University({
      id: 1,
      name: 'Marmara Üniversitesi',
      city: 'İstanbul',
      type: 'Devlet',
      aliases: ['M.Ü.', 'Marmara'],
    }),
    new University({
      id: 2,
      name: 'Boğaziçi Üniversitesi',
      city: 'İstanbul',
      type: 'Devlet',
      aliases: ['B.Ü.', 'Boğaziçi'],
    }),
  ];

  const mockDepartments: Department[] = [
    new Department({
      id: 101,
      universityId: 1,
      name: 'Bilgisayar Mühendisliği',
      faculty: 'Mühendislik Fakültesi',
      language: 'Türkçe',
      aliases: ['BM', 'Comp Eng'],
    }),
    new Department({
      id: 102,
      universityId: 1,
      name: 'İşletme',
      faculty: 'İktisadi ve İdari Bilimler Fakültesi',
      language: 'İngilizce',
      aliases: ['İşl', 'Business'],
    }),
  ];

  const mockScoreData: ScoreData[] = [
    new ScoreData({
      departmentId: 101,
      year: 2023,
      scoreType: 'SAY',
      baseScore: 450.5,
      ceilingScore: 520.3,
      baseRank: 15000,
      ceilingRank: 5000,
      quota: 120,
    }),
    new ScoreData({
      departmentId: 102,
      year: 2023,
      scoreType: 'EA',
      baseScore: 380.2,
      ceilingScore: 480.7,
      baseRank: 25000,
      ceilingRank: 8000,
      quota: 80,
    }),
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockCacheService = new CacheService({} as any) as jest.Mocked<CacheService>;
    mockYokAtlasImporter = new YokAtlasImporter() as jest.Mocked<YokAtlasImporter>;
    mockDataService = new DataService(mockCacheService) as jest.Mocked<DataService>;

    // Setup mock implementations
    mockCacheService.delete = jest.fn().mockResolvedValue(true);
    
    mockYokAtlasImporter.importAllDataWithProgress = jest.fn().mockImplementation(
      async (year: number, onProgress?: (progress: any) => void) => {
        // Simulate progress callbacks
        onProgress?.({ stage: 'universities', current: 1, total: 2, message: 'Importing universities...' });
        onProgress?.({ stage: 'departments', current: 1, total: 2, message: 'Importing departments...' });
        onProgress?.({ stage: 'scoreData', current: 1, total: 2, message: 'Importing score data...' });

        return {
          universities: mockUniversities,
          departments: mockDepartments,
          scoreData: mockScoreData,
          summary: {
            processed: 6,
            successful: 6,
            failed: 0,
            errors: [],
          },
        };
      }
    );

    mockDataService.importUniversities = jest.fn().mockResolvedValue(mockUniversities);
    mockDataService.importDepartments = jest.fn().mockResolvedValue(mockDepartments);
    mockDataService.importScoreData = jest.fn().mockResolvedValue(mockScoreData);

    // Create service instance
    dataImportService = new DataImportService(mockCacheService);
    
    // Inject mocks (this would normally be done through dependency injection)
    (dataImportService as any).yokAtlasImporter = mockYokAtlasImporter;
    (dataImportService as any).dataService = mockDataService;
  });

  describe('importYearData', () => {
    it('should successfully import all data for a year', async () => {
      const progressUpdates: ImportProgress[] = [];
      
      const result = await dataImportService.importYearData(2023, (progress) => {
        progressUpdates.push(progress);
      });

      expect(result.success).toBe(true);
      expect(result.summary.universities.imported).toBe(2);
      expect(result.summary.departments.imported).toBe(2);
      expect(result.summary.scoreData.imported).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThan(0);

      // Verify progress updates were called
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.stage === 'complete')).toBe(true);

      // Verify cache was cleared
      expect(mockCacheService.delete).toHaveBeenCalledWith('universities:*');
      expect(mockCacheService.delete).toHaveBeenCalledWith('departments:*');
      expect(mockCacheService.delete).toHaveBeenCalledWith('score_data:*');

      // Verify import methods were called
      expect(mockYokAtlasImporter.importAllDataWithProgress).toHaveBeenCalledWith(2023, expect.any(Function));
      expect(mockDataService.importUniversities).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'Marmara Üniversitesi' }),
          expect.objectContaining({ id: 2, name: 'Boğaziçi Üniversitesi' }),
        ])
      );
      expect(mockDataService.importDepartments).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 101, name: 'Bilgisayar Mühendisliği' }),
          expect.objectContaining({ id: 102, name: 'İşletme' }),
        ])
      );
      expect(mockDataService.importScoreData).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ departmentId: 101, year: 2023 }),
          expect.objectContaining({ departmentId: 102, year: 2023 }),
        ])
      );
    });

    it('should handle partial failures gracefully', async () => {
      // Mock partial failure in departments import
      mockDataService.importDepartments = jest.fn().mockResolvedValue([mockDepartments[0]]); // Only import first department

      const result = await dataImportService.importYearData(2023);

      expect(result.success).toBe(true);
      expect(result.summary.universities.imported).toBe(2);
      expect(result.summary.departments.imported).toBe(1);
      expect(result.summary.departments.failed).toBe(1);
      expect(result.summary.scoreData.imported).toBe(2);
    });

    it('should handle import errors and throw ExternalServiceError', async () => {
      mockYokAtlasImporter.importAllDataWithProgress = jest.fn().mockRejectedValue(
        new Error('YÖK Atlas connection failed')
      );

      await expect(dataImportService.importYearData(2023)).rejects.toThrow(
        'Data import failed: YÖK Atlas connection failed'
      );
    });
  });

  describe('importUniversitiesOnly', () => {
    it('should import only universities successfully', async () => {
      mockYokAtlasImporter.importUniversities = jest.fn().mockResolvedValue(mockUniversities);

      const result = await dataImportService.importUniversitiesOnly();

      expect(result.universities).toHaveLength(2);
      expect(result.summary.imported).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      expect(mockYokAtlasImporter.importUniversities).toHaveBeenCalled();
      expect(mockDataService.importUniversities).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Marmara Üniversitesi' }),
          expect.objectContaining({ name: 'Boğaziçi Üniversitesi' }),
        ])
      );
    });
  });

  describe('importUniversityDepartments', () => {
    it('should import departments for a specific university', async () => {
      mockYokAtlasImporter.importDepartments = jest.fn().mockResolvedValue(mockDepartments);

      const result = await dataImportService.importUniversityDepartments(1);

      expect(result.departments).toHaveLength(2);
      expect(result.summary.imported).toBe(2);
      expect(result.summary.failed).toBe(0);

      expect(mockYokAtlasImporter.importDepartments).toHaveBeenCalledWith(1);
      expect(mockDataService.importDepartments).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ universityId: 1, name: 'Bilgisayar Mühendisliği' }),
          expect.objectContaining({ universityId: 1, name: 'İşletme' }),
        ])
      );
    });
  });

  describe('importDepartmentScoreData', () => {
    it('should import score data for a specific department and year', async () => {
      mockYokAtlasImporter.importScoreData = jest.fn().mockResolvedValue(mockScoreData);

      const result = await dataImportService.importDepartmentScoreData(101, 2023);

      expect(result.scoreData).toHaveLength(2);
      expect(result.summary.imported).toBe(2);
      expect(result.summary.failed).toBe(0);

      expect(mockYokAtlasImporter.importScoreData).toHaveBeenCalledWith(101, 2023);
      expect(mockDataService.importScoreData).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ departmentId: 101, year: 2023 }),
          expect.objectContaining({ departmentId: 102, year: 2023 }),
        ])
      );
    });
  });

  describe('validateImportedData', () => {
    beforeEach(() => {
      mockDataService.getSystemStatistics = jest.fn().mockResolvedValue({
        universities: { total: 150, byType: { Devlet: 120, Vakıf: 30 }, byCityTop10: [] },
        departments: { total: 2500, byLanguage: [], byFacultyTop10: [] },
        scoreData: { totalRecords: 15000, byScoreType: [], byYear: [] },
      });

      mockDataService.getUniversities = jest.fn().mockResolvedValue(mockUniversities);
      mockDataService.getDepartments = jest.fn().mockResolvedValue(mockDepartments);
      mockDataService.getAvailableYears = jest.fn().mockResolvedValue([2021, 2022, 2023]);
      mockDataService.getScoreDataByType = jest.fn().mockResolvedValue(mockScoreData);
    });

    it('should validate data successfully when all checks pass', async () => {
      const result = await dataImportService.validateImportedData(2023);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.statistics.universities).toBe(150);
      expect(result.statistics.departments).toBe(2500);
      expect(result.statistics.scoreData).toBe(15000);
      expect(result.statistics.orphanedDepartments).toBe(0);
      expect(result.statistics.orphanedScoreData).toBe(0);
    });

    it('should detect orphaned departments', async () => {
      // Create departments with non-existent university IDs
      const orphanedDepartments = [
        ...mockDepartments,
        new Department({
          id: 999,
          universityId: 999, // Non-existent university
          name: 'Orphaned Department',
          faculty: 'Unknown Faculty',
          language: 'Türkçe',
          aliases: [],
        }),
      ];

      mockDataService.getDepartments = jest.fn().mockResolvedValue(orphanedDepartments);

      const result = await dataImportService.validateImportedData(2023);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Found 1 orphaned departments');
      expect(result.statistics.orphanedDepartments).toBe(1);
    });

    it('should detect insufficient data', async () => {
      mockDataService.getSystemStatistics = jest.fn().mockResolvedValue({
        universities: { total: 5, byType: { Devlet: 5, Vakıf: 0 }, byCityTop10: [] }, // Below minimum
        departments: { total: 50, byLanguage: [], byFacultyTop10: [] }, // Below minimum
        scoreData: { totalRecords: 100, byScoreType: [], byYear: [] },
      });

      const result = await dataImportService.validateImportedData(2023);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Insufficient universities imported (minimum 10 expected)');
      expect(result.issues).toContain('Insufficient departments imported (minimum 100 expected)');
    });

    it('should detect missing year data', async () => {
      mockDataService.getAvailableYears = jest.fn().mockResolvedValue([2021, 2022]); // Missing 2023

      const result = await dataImportService.validateImportedData(2023);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('No score data found for year 2023');
    });
  });

  describe('getImportStatus', () => {
    beforeEach(() => {
      mockDataService.getSystemStatistics = jest.fn().mockResolvedValue({
        universities: { total: 150, byType: { Devlet: 120, Vakıf: 30 }, byCityTop10: [] },
        departments: { total: 2500, byLanguage: [], byFacultyTop10: [] },
        scoreData: { totalRecords: 15000, byScoreType: [], byYear: [] },
      });

      mockDataService.healthCheck = jest.fn().mockResolvedValue({
        status: 'healthy' as const,
        checks: {
          database: true,
          cache: true,
          dataAvailability: {
            universities: 150,
            departments: 2500,
            scoreData: 3,
          },
        },
      });

      mockDataService.getAvailableYears = jest.fn().mockResolvedValue([2021, 2022, 2023]);
    });

    it('should return comprehensive import status', async () => {
      const status = await dataImportService.getImportStatus();

      expect(status.lastImport.year).toBe(2023);
      expect(status.lastImport.status).toBe('success');
      expect(status.dataAvailability.universities).toBe(150);
      expect(status.dataAvailability.departments).toBe(2500);
      expect(status.dataAvailability.availableYears).toEqual([2021, 2022, 2023]);
      expect(status.dataAvailability.totalScoreRecords).toBe(15000);
      expect(status.systemHealth.status).toBe('healthy');
      expect(status.systemHealth.issues).toHaveLength(0);
    });

    it('should detect system health issues', async () => {
      mockDataService.healthCheck = jest.fn().mockResolvedValue({
        status: 'degraded' as const,
        checks: {
          database: false,
          cache: true,
          dataAvailability: {
            universities: 0,
            departments: 0,
            scoreData: 0,
          },
        },
      });

      const status = await dataImportService.getImportStatus();

      expect(status.systemHealth.status).toBe('degraded');
      expect(status.systemHealth.issues).toContain('Database connection issues');
      expect(status.systemHealth.issues).toContain('No universities data available');
      expect(status.systemHealth.issues).toContain('No departments data available');
    });

    it('should handle never imported state', async () => {
      mockDataService.getSystemStatistics = jest.fn().mockResolvedValue({
        universities: { total: 0, byType: { Devlet: 0, Vakıf: 0 }, byCityTop10: [] },
        departments: { total: 0, byLanguage: [], byFacultyTop10: [] },
        scoreData: { totalRecords: 0, byScoreType: [], byYear: [] },
      });

      mockDataService.getAvailableYears = jest.fn().mockResolvedValue([]);

      const status = await dataImportService.getImportStatus();

      expect(status.lastImport.year).toBeNull();
      expect(status.lastImport.status).toBe('never');
      expect(status.dataAvailability.availableYears).toHaveLength(0);
    });
  });
});
import logger from '@/utils/logger';
import { YokAtlasImporter } from './YokAtlasImporter';
import { DataService } from './DataService';
import { CacheService } from './CacheService';
import { University, Department, ScoreData } from '@/models';
import { ExternalServiceError, ValidationError } from '@/utils/errors';

export interface ImportProgress {
  stage: 'universities' | 'departments' | 'scoreData' | 'complete';
  current: number;
  total: number;
  message: string;
  percentage: number;
}

export interface ImportResult {
  success: boolean;
  summary: {
    universities: { imported: number; failed: number };
    departments: { imported: number; failed: number };
    scoreData: { imported: number; failed: number };
  };
  errors: string[];
  duration: number;
}

/**
 * Service that orchestrates data import from YÖK Atlas and integration with the data layer
 */
export class DataImportService {
  private yokAtlasImporter: YokAtlasImporter;
  private dataService: DataService;
  private cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
    this.yokAtlasImporter = new YokAtlasImporter();
    this.dataService = new DataService(cacheService);
  }

  /**
   * Import all data for a specific year with progress tracking
   */
  async importYearData(
    year: number,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    const startTime = Date.now();
    logger.info(`Starting data import for year ${year}`);

    const result: ImportResult = {
      success: false,
      summary: {
        universities: { imported: 0, failed: 0 },
        departments: { imported: 0, failed: 0 },
        scoreData: { imported: 0, failed: 0 },
      },
      errors: [],
      duration: 0,
    };

    try {
      // Clear cache before import
      await this.clearImportCache();

      // Import data with progress tracking
      const importData = await this.yokAtlasImporter.importAllDataWithProgress(
        year,
        (progress) => {
          const percentage = Math.round((progress.current / progress.total) * 100);
          onProgress?.({
            stage: progress.stage as any,
            current: progress.current,
            total: progress.total,
            message: progress.message,
            percentage,
          });
        }
      );

      // Store universities
      onProgress?.({
        stage: 'universities',
        current: 0,
        total: importData.universities.length,
        message: 'Storing universities in database...',
        percentage: 0,
      });

      const storedUniversities = await this.dataService.importUniversities(
        importData.universities.map(u => ({
          id: u.id,
          name: u.name,
          city: u.city,
          type: u.type,
          aliases: u.aliases,
        }))
      );
      result.summary.universities.imported = storedUniversities.length;
      result.summary.universities.failed = importData.universities.length - storedUniversities.length;

      // Store departments
      onProgress?.({
        stage: 'departments',
        current: 0,
        total: importData.departments.length,
        message: 'Storing departments in database...',
        percentage: 0,
      });

      const storedDepartments = await this.dataService.importDepartments(
        importData.departments.map(d => ({
          id: d.id,
          universityId: d.universityId,
          name: d.name,
          faculty: d.faculty,
          language: d.language,
          aliases: d.aliases,
        }))
      );
      result.summary.departments.imported = storedDepartments.length;
      result.summary.departments.failed = importData.departments.length - storedDepartments.length;

      // Store score data
      onProgress?.({
        stage: 'scoreData',
        current: 0,
        total: importData.scoreData.length,
        message: 'Storing score data in database...',
        percentage: 0,
      });

      const storedScoreData = await this.dataService.importScoreData(
        importData.scoreData.map(s => ({
          departmentId: s.departmentId,
          year: s.year,
          scoreType: s.scoreType,
          baseScore: s.baseScore,
          ceilingScore: s.ceilingScore,
          baseRank: s.baseRank,
          ceilingRank: s.ceilingRank,
          quota: s.quota,
        }))
      );
      result.summary.scoreData.imported = storedScoreData.length;
      result.summary.scoreData.failed = importData.scoreData.length - storedScoreData.length;

      // Add import summary errors
      result.errors = importData.summary.errors;

      result.success = true;
      result.duration = Date.now() - startTime;

      onProgress?.({
        stage: 'complete',
        current: 1,
        total: 1,
        message: 'Import completed successfully',
        percentage: 100,
      });

      logger.info(`Data import completed successfully in ${result.duration}ms`, {
        summary: result.summary,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors.push(`Import failed: ${error.message}`);
      
      logger.error('Data import failed:', error);
      throw new ExternalServiceError(`Data import failed: ${error.message}`);
    }
  }

  /**
   * Import only universities
   */
  async importUniversitiesOnly(): Promise<{
    universities: University[];
    summary: { imported: number; failed: number };
    errors: string[];
  }> {
    logger.info('Starting universities-only import');

    try {
      const universities = await this.yokAtlasImporter.importUniversities();
      
      const storedUniversities = await this.dataService.importUniversities(
        universities.map(u => ({
          id: u.id,
          name: u.name,
          city: u.city,
          type: u.type,
          aliases: u.aliases,
        }))
      );

      const summary = {
        imported: storedUniversities.length,
        failed: universities.length - storedUniversities.length,
      };

      logger.info(`Universities import completed: ${summary.imported} imported, ${summary.failed} failed`);

      return {
        universities: storedUniversities.map(u => new University(u)),
        summary,
        errors: [],
      };
    } catch (error: any) {
      logger.error('Universities import failed:', error);
      throw new ExternalServiceError(`Universities import failed: ${error.message}`);
    }
  }

  /**
   * Import departments for a specific university
   */
  async importUniversityDepartments(universityId: number): Promise<{
    departments: Department[];
    summary: { imported: number; failed: number };
    errors: string[];
  }> {
    logger.info(`Starting departments import for university ${universityId}`);

    try {
      const departments = await this.yokAtlasImporter.importDepartments(universityId);
      
      const storedDepartments = await this.dataService.importDepartments(
        departments.map(d => ({
          id: d.id,
          universityId: d.universityId,
          name: d.name,
          faculty: d.faculty,
          language: d.language,
          aliases: d.aliases,
        }))
      );

      const summary = {
        imported: storedDepartments.length,
        failed: departments.length - storedDepartments.length,
      };

      logger.info(`Departments import completed for university ${universityId}: ${summary.imported} imported, ${summary.failed} failed`);

      return {
        departments: storedDepartments.map(d => new Department(d)),
        summary,
        errors: [],
      };
    } catch (error: any) {
      logger.error(`Departments import failed for university ${universityId}:`, error);
      throw new ExternalServiceError(`Departments import failed: ${error.message}`);
    }
  }

  /**
   * Import score data for a specific department and year
   */
  async importDepartmentScoreData(departmentId: number, year: number): Promise<{
    scoreData: ScoreData[];
    summary: { imported: number; failed: number };
    errors: string[];
  }> {
    logger.info(`Starting score data import for department ${departmentId}, year ${year}`);

    try {
      const scoreData = await this.yokAtlasImporter.importScoreData(departmentId, year);
      
      const storedScoreData = await this.dataService.importScoreData(
        scoreData.map(s => ({
          departmentId: s.departmentId,
          year: s.year,
          scoreType: s.scoreType,
          baseScore: s.baseScore,
          ceilingScore: s.ceilingScore,
          baseRank: s.baseRank,
          ceilingRank: s.ceilingRank,
          quota: s.quota,
        }))
      );

      const summary = {
        imported: storedScoreData.length,
        failed: scoreData.length - storedScoreData.length,
      };

      logger.info(`Score data import completed for department ${departmentId}: ${summary.imported} imported, ${summary.failed} failed`);

      return {
        scoreData: storedScoreData.map(s => new ScoreData(s)),
        summary,
        errors: [],
      };
    } catch (error: any) {
      logger.error(`Score data import failed for department ${departmentId}:`, error);
      throw new ExternalServiceError(`Score data import failed: ${error.message}`);
    }
  }

  /**
   * Validate imported data integrity
   */
  async validateImportedData(year: number): Promise<{
    isValid: boolean;
    issues: string[];
    statistics: {
      universities: number;
      departments: number;
      scoreData: number;
      orphanedDepartments: number;
      orphanedScoreData: number;
    };
  }> {
    logger.info(`Validating imported data for year ${year}`);

    try {
      const issues: string[] = [];
      
      // Get statistics
      const stats = await this.dataService.getSystemStatistics();
      
      // Check for orphaned departments (departments without valid university)
      const universities = await this.dataService.getUniversities();
      const departments = await this.dataService.getDepartments();
      const universityIds = new Set(universities.map(u => u.id));
      
      const orphanedDepartments = departments.filter(d => !universityIds.has(d.universityId));
      if (orphanedDepartments.length > 0) {
        issues.push(`Found ${orphanedDepartments.length} orphaned departments`);
      }

      // Check for orphaned score data (score data without valid department)
      const availableYears = await this.dataService.getAvailableYears();
      let orphanedScoreDataCount = 0;
      
      if (availableYears.includes(year)) {
        const departmentIds = new Set(departments.map(d => d.id));
        
        // Sample check on a subset of score data to avoid performance issues
        const sampleScoreData = await this.dataService.getScoreDataByType('TYT', year, 100);
        const orphanedScoreData = sampleScoreData.filter(s => !departmentIds.has(s.departmentId));
        orphanedScoreDataCount = orphanedScoreData.length;
        
        if (orphanedScoreDataCount > 0) {
          issues.push(`Found ${orphanedScoreDataCount} orphaned score data records (sample check)`);
        }
      }

      // Check minimum data requirements
      if (stats.universities.total < 10) {
        issues.push('Insufficient universities imported (minimum 10 expected)');
      }

      if (stats.departments.total < 100) {
        issues.push('Insufficient departments imported (minimum 100 expected)');
      }

      if (!availableYears.includes(year)) {
        issues.push(`No score data found for year ${year}`);
      }

      const statistics = {
        universities: stats.universities.total,
        departments: stats.departments.total,
        scoreData: stats.scoreData.totalRecords,
        orphanedDepartments: orphanedDepartments.length,
        orphanedScoreData: orphanedScoreDataCount,
      };

      const isValid = issues.length === 0;

      logger.info(`Data validation completed: ${isValid ? 'VALID' : 'ISSUES FOUND'}`, {
        statistics,
        issues: issues.length,
      });

      return {
        isValid,
        issues,
        statistics,
      };
    } catch (error: any) {
      logger.error('Data validation failed:', error);
      throw new ValidationError(`Data validation failed: ${error.message}`);
    }
  }

  /**
   * Clear import-related cache
   */
  private async clearImportCache(): Promise<void> {
    try {
      // Clear university and department caches
      await this.cacheService.delete('universities:*');
      await this.cacheService.delete('departments:*');
      await this.cacheService.delete('score_data:*');
      
      logger.info('Import cache cleared successfully');
    } catch (error) {
      logger.warn('Failed to clear import cache:', error);
      // Don't throw error, just log warning
    }
  }

  /**
   * Get import status and statistics
   */
  async getImportStatus(): Promise<{
    lastImport: {
      year: number | null;
      date: Date | null;
      status: 'success' | 'failed' | 'never';
    };
    dataAvailability: {
      universities: number;
      departments: number;
      availableYears: number[];
      totalScoreRecords: number;
    };
    systemHealth: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      issues: string[];
    };
  }> {
    try {
      const [stats, healthCheck, availableYears] = await Promise.all([
        this.dataService.getSystemStatistics(),
        this.dataService.healthCheck(),
        this.dataService.getAvailableYears(),
      ]);

      // Determine last import info (this would typically come from a metadata table)
      const lastImport = {
        year: availableYears.length > 0 ? Math.max(...availableYears) : null,
        date: null, // Would need to track this in metadata
        status: stats.universities.total > 0 ? 'success' as const : 'never' as const,
      };

      const dataAvailability = {
        universities: stats.universities.total,
        departments: stats.departments.total,
        availableYears,
        totalScoreRecords: stats.scoreData.totalRecords,
      };

      const systemHealth = {
        status: healthCheck.status,
        issues: [] as string[],
      };

      // Add specific issues based on health check
      if (!healthCheck.checks.database) {
        systemHealth.issues.push('Database connection issues');
      }
      if (!healthCheck.checks.cache) {
        systemHealth.issues.push('Cache service issues');
      }
      if (healthCheck.checks.dataAvailability.universities === 0) {
        systemHealth.issues.push('No universities data available');
      }
      if (healthCheck.checks.dataAvailability.departments === 0) {
        systemHealth.issues.push('No departments data available');
      }

      return {
        lastImport,
        dataAvailability,
        systemHealth,
      };
    } catch (error: any) {
      logger.error('Failed to get import status:', error);
      throw new ExternalServiceError(`Failed to get import status: ${error.message}`);
    }
  }
}
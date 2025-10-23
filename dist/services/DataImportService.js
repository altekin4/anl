"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataImportService = void 0;
const logger_1 = __importDefault(require("@/utils/logger"));
const YokAtlasImporter_1 = require("./YokAtlasImporter");
const DataService_1 = require("./DataService");
const models_1 = require("@/models");
const errors_1 = require("@/utils/errors");
/**
 * Service that orchestrates data import from YÖK Atlas and integration with the data layer
 */
class DataImportService {
    constructor(cacheService) {
        this.cacheService = cacheService;
        this.yokAtlasImporter = new YokAtlasImporter_1.YokAtlasImporter();
        this.dataService = new DataService_1.DataService(cacheService);
    }
    /**
     * Import all data for a specific year with progress tracking
     */
    async importYearData(year, onProgress) {
        const startTime = Date.now();
        logger_1.default.info(`Starting data import for year ${year}`);
        const result = {
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
            const importData = await this.yokAtlasImporter.importAllDataWithProgress(year, (progress) => {
                const percentage = Math.round((progress.current / progress.total) * 100);
                onProgress?.({
                    stage: progress.stage,
                    current: progress.current,
                    total: progress.total,
                    message: progress.message,
                    percentage,
                });
            });
            // Store universities
            onProgress?.({
                stage: 'universities',
                current: 0,
                total: importData.universities.length,
                message: 'Storing universities in database...',
                percentage: 0,
            });
            const storedUniversities = await this.dataService.importUniversities(importData.universities.map(u => ({
                id: u.id,
                name: u.name,
                city: u.city,
                type: u.type,
                aliases: u.aliases,
            })));
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
            const storedDepartments = await this.dataService.importDepartments(importData.departments.map(d => ({
                id: d.id,
                universityId: d.universityId,
                name: d.name,
                faculty: d.faculty,
                language: d.language,
                aliases: d.aliases,
            })));
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
            const storedScoreData = await this.dataService.importScoreData(importData.scoreData.map(s => ({
                departmentId: s.departmentId,
                year: s.year,
                scoreType: s.scoreType,
                baseScore: s.baseScore,
                ceilingScore: s.ceilingScore,
                baseRank: s.baseRank,
                ceilingRank: s.ceilingRank,
                quota: s.quota,
            })));
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
            logger_1.default.info(`Data import completed successfully in ${result.duration}ms`, {
                summary: result.summary,
                errors: result.errors.length,
            });
            return result;
        }
        catch (error) {
            result.duration = Date.now() - startTime;
            result.errors.push(`Import failed: ${error.message}`);
            logger_1.default.error('Data import failed:', error);
            throw new errors_1.ExternalServiceError(`Data import failed: ${error.message}`);
        }
    }
    /**
     * Import only universities
     */
    async importUniversitiesOnly() {
        logger_1.default.info('Starting universities-only import');
        try {
            const universities = await this.yokAtlasImporter.importUniversities();
            const storedUniversities = await this.dataService.importUniversities(universities.map(u => ({
                id: u.id,
                name: u.name,
                city: u.city,
                type: u.type,
                aliases: u.aliases,
            })));
            const summary = {
                imported: storedUniversities.length,
                failed: universities.length - storedUniversities.length,
            };
            logger_1.default.info(`Universities import completed: ${summary.imported} imported, ${summary.failed} failed`);
            return {
                universities: storedUniversities.map(u => new models_1.University(u)),
                summary,
                errors: [],
            };
        }
        catch (error) {
            logger_1.default.error('Universities import failed:', error);
            throw new errors_1.ExternalServiceError(`Universities import failed: ${error.message}`);
        }
    }
    /**
     * Import departments for a specific university
     */
    async importUniversityDepartments(universityId) {
        logger_1.default.info(`Starting departments import for university ${universityId}`);
        try {
            const departments = await this.yokAtlasImporter.importDepartments(universityId);
            const storedDepartments = await this.dataService.importDepartments(departments.map(d => ({
                id: d.id,
                universityId: d.universityId,
                name: d.name,
                faculty: d.faculty,
                language: d.language,
                aliases: d.aliases,
            })));
            const summary = {
                imported: storedDepartments.length,
                failed: departments.length - storedDepartments.length,
            };
            logger_1.default.info(`Departments import completed for university ${universityId}: ${summary.imported} imported, ${summary.failed} failed`);
            return {
                departments: storedDepartments.map(d => new models_1.Department(d)),
                summary,
                errors: [],
            };
        }
        catch (error) {
            logger_1.default.error(`Departments import failed for university ${universityId}:`, error);
            throw new errors_1.ExternalServiceError(`Departments import failed: ${error.message}`);
        }
    }
    /**
     * Import score data for a specific department and year
     */
    async importDepartmentScoreData(departmentId, year) {
        logger_1.default.info(`Starting score data import for department ${departmentId}, year ${year}`);
        try {
            const scoreData = await this.yokAtlasImporter.importScoreData(departmentId, year);
            const storedScoreData = await this.dataService.importScoreData(scoreData.map(s => ({
                departmentId: s.departmentId,
                year: s.year,
                scoreType: s.scoreType,
                baseScore: s.baseScore,
                ceilingScore: s.ceilingScore,
                baseRank: s.baseRank,
                ceilingRank: s.ceilingRank,
                quota: s.quota,
            })));
            const summary = {
                imported: storedScoreData.length,
                failed: scoreData.length - storedScoreData.length,
            };
            logger_1.default.info(`Score data import completed for department ${departmentId}: ${summary.imported} imported, ${summary.failed} failed`);
            return {
                scoreData: storedScoreData.map(s => new models_1.ScoreData(s)),
                summary,
                errors: [],
            };
        }
        catch (error) {
            logger_1.default.error(`Score data import failed for department ${departmentId}:`, error);
            throw new errors_1.ExternalServiceError(`Score data import failed: ${error.message}`);
        }
    }
    /**
     * Validate imported data integrity
     */
    async validateImportedData(year) {
        logger_1.default.info(`Validating imported data for year ${year}`);
        try {
            const issues = [];
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
            logger_1.default.info(`Data validation completed: ${isValid ? 'VALID' : 'ISSUES FOUND'}`, {
                statistics,
                issues: issues.length,
            });
            return {
                isValid,
                issues,
                statistics,
            };
        }
        catch (error) {
            logger_1.default.error('Data validation failed:', error);
            throw new errors_1.ValidationError(`Data validation failed: ${error.message}`);
        }
    }
    /**
     * Clear import-related cache
     */
    async clearImportCache() {
        try {
            // Clear university and department caches
            await this.cacheService.delete('universities:*');
            await this.cacheService.delete('departments:*');
            await this.cacheService.delete('score_data:*');
            logger_1.default.info('Import cache cleared successfully');
        }
        catch (error) {
            logger_1.default.warn('Failed to clear import cache:', error);
            // Don't throw error, just log warning
        }
    }
    /**
     * Get import status and statistics
     */
    async getImportStatus() {
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
                status: stats.universities.total > 0 ? 'success' : 'never',
            };
            const dataAvailability = {
                universities: stats.universities.total,
                departments: stats.departments.total,
                availableYears,
                totalScoreRecords: stats.scoreData.totalRecords,
            };
            const systemHealth = {
                status: healthCheck.status,
                issues: [],
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
        }
        catch (error) {
            logger_1.default.error('Failed to get import status:', error);
            throw new errors_1.ExternalServiceError(`Failed to get import status: ${error.message}`);
        }
    }
}
exports.DataImportService = DataImportService;
//# sourceMappingURL=DataImportService.js.map
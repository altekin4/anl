"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataService = void 0;
const UniversityRepository_1 = require("@/repositories/UniversityRepository");
const DepartmentRepository_1 = require("@/repositories/DepartmentRepository");
const ScoreDataRepository_1 = require("@/repositories/ScoreDataRepository");
const logger_1 = __importDefault(require("@/utils/logger"));
class DataService {
    constructor(cacheService) {
        this.universityRepo = new UniversityRepository_1.UniversityRepository(cacheService);
        this.departmentRepo = new DepartmentRepository_1.DepartmentRepository(cacheService);
        this.scoreDataRepo = new ScoreDataRepository_1.ScoreDataRepository(cacheService);
    }
    // University methods
    async getUniversities() {
        logger_1.default.debug('Fetching all universities');
        return this.universityRepo.getAll();
    }
    async getUniversityById(id) {
        logger_1.default.debug(`Fetching university by ID: ${id}`);
        return this.universityRepo.getById(id);
    }
    async searchUniversities(query, limit = 10) {
        logger_1.default.debug(`Searching universities with query: "${query}"`);
        return this.universityRepo.search(query, limit);
    }
    async findUniversityByName(name) {
        logger_1.default.debug(`Finding university by name: "${name}"`);
        return this.universityRepo.findByName(name);
    }
    async getUniversitiesByType(type) {
        logger_1.default.debug(`Fetching universities by type: ${type}`);
        return this.universityRepo.getByType(type);
    }
    async getUniversitiesByCity(city) {
        logger_1.default.debug(`Fetching universities by city: ${city}`);
        return this.universityRepo.getByCity(city);
    }
    // Department methods
    async getDepartments(universityId) {
        logger_1.default.debug(`Fetching departments${universityId ? ` for university ${universityId}` : ''}`);
        return universityId
            ? this.departmentRepo.getByUniversityId(universityId)
            : this.departmentRepo.getAll();
    }
    async getDepartmentById(id) {
        logger_1.default.debug(`Fetching department by ID: ${id}`);
        return this.departmentRepo.getById(id);
    }
    async searchDepartments(query, universityId, limit = 10) {
        logger_1.default.debug(`Searching departments with query: "${query}"${universityId ? ` in university ${universityId}` : ''}`);
        return this.departmentRepo.search(query, universityId, limit);
    }
    async findDepartmentByNameAndUniversity(name, universityId) {
        logger_1.default.debug(`Finding department "${name}" in university ${universityId}`);
        return this.departmentRepo.findByNameAndUniversity(name, universityId);
    }
    async getDepartmentsByLanguage(language) {
        logger_1.default.debug(`Fetching departments by language: ${language}`);
        return this.departmentRepo.getByLanguage(language);
    }
    async getDepartmentsByFaculty(faculty) {
        logger_1.default.debug(`Fetching departments by faculty: ${faculty}`);
        return this.departmentRepo.getByFaculty(faculty);
    }
    // Score data methods
    async getScoreData(departmentId, year) {
        logger_1.default.debug(`Fetching score data for department ${departmentId}${year ? ` for year ${year}` : ''}`);
        return this.scoreDataRepo.getByDepartmentAndYear(departmentId, year);
    }
    async getLatestScoreData(departmentId) {
        logger_1.default.debug(`Fetching latest score data for department ${departmentId}`);
        return this.scoreDataRepo.getLatestByDepartment(departmentId);
    }
    async getScoreDataByType(scoreType, year, limit = 100) {
        logger_1.default.debug(`Fetching score data by type ${scoreType} for year ${year}`);
        return this.scoreDataRepo.getByScoreTypeAndYear(scoreType, year, limit);
    }
    async getDepartmentsByScoreRange(scoreType, minScore, maxScore, year, limit = 50) {
        logger_1.default.debug(`Fetching departments by score range: ${minScore}-${maxScore} for type ${scoreType}`);
        return this.scoreDataRepo.getDepartmentsByScoreRange(scoreType, minScore, maxScore, year, limit);
    }
    async getAvailableYears() {
        logger_1.default.debug('Fetching available years for score data');
        return this.scoreDataRepo.getAvailableYears();
    }
    // Combined search methods
    async findDepartmentByUniversityAndDepartmentName(universityName, departmentName, language) {
        logger_1.default.debug(`Finding department: "${departmentName}" at "${universityName}"${language ? ` (${language})` : ''}`);
        // Find university
        const university = await this.findUniversityByName(universityName);
        if (!university) {
            return { university: null, department: null, scoreData: [] };
        }
        // Find department
        const departmentMatches = await this.searchDepartments(departmentName, university.id, 10);
        let department = null;
        if (departmentMatches.length > 0) {
            // If language is specified, try to find exact language match
            if (language) {
                const languageMatch = departmentMatches.find(match => match.item.language.toLowerCase().includes(language.toLowerCase()));
                department = languageMatch ? languageMatch.item : departmentMatches[0].item;
            }
            else {
                department = departmentMatches[0].item;
            }
        }
        // Get score data if department found
        const scoreData = department
            ? await this.getLatestScoreData(department.id)
            : [];
        return { university, department, scoreData };
    }
    async suggestSimilarDepartments(targetScore, scoreType, year, limit = 10) {
        logger_1.default.debug(`Suggesting similar departments for score ${targetScore} (${scoreType})`);
        // Get departments within ±50 points of target score
        const scoreRange = 50;
        const scoreDataList = await this.getDepartmentsByScoreRange(scoreType, Math.max(0, targetScore - scoreRange), Math.min(600, targetScore + scoreRange), year, limit * 2 // Get more to filter and sort
        );
        const suggestions = [];
        for (const scoreData of scoreDataList) {
            const department = await this.getDepartmentById(scoreData.departmentId);
            if (!department)
                continue;
            const university = await this.getUniversityById(department.universityId);
            if (!university)
                continue;
            const scoreDifference = Math.abs(scoreData.baseScore - targetScore);
            suggestions.push({
                department,
                university,
                scoreData,
                scoreDifference,
            });
        }
        // Sort by score difference and return top results
        return suggestions
            .sort((a, b) => a.scoreDifference - b.scoreDifference)
            .slice(0, limit);
    }
    // Statistics methods
    async getSystemStatistics() {
        logger_1.default.debug('Fetching system statistics');
        const [universityStats, departmentStats, scoreDataStats] = await Promise.all([
            this.universityRepo.getStatistics(),
            this.departmentRepo.getStatistics(),
            this.scoreDataRepo.getStatistics(),
        ]);
        return {
            universities: universityStats,
            departments: departmentStats,
            scoreData: scoreDataStats,
        };
    }
    // Data import methods (for admin use)
    async importUniversities(universities) {
        logger_1.default.info(`Importing ${universities.length} universities`);
        return this.universityRepo.bulkCreate(universities);
    }
    async importDepartments(departments) {
        logger_1.default.info(`Importing ${departments.length} departments`);
        return this.departmentRepo.bulkCreate(departments);
    }
    async importScoreData(scoreDataList) {
        logger_1.default.info(`Importing ${scoreDataList.length} score data records`);
        return this.scoreDataRepo.bulkCreate(scoreDataList);
    }
    // Health check method
    async healthCheck() {
        try {
            const [universities, departments, availableYears] = await Promise.all([
                this.getUniversities(),
                this.getDepartments(),
                this.getAvailableYears(),
            ]);
            const checks = {
                database: true,
                cache: true, // Assume cache is working if we got here
                dataAvailability: {
                    universities: universities.length,
                    departments: departments.length,
                    scoreData: availableYears.length,
                },
            };
            const status = checks.dataAvailability.universities > 0 &&
                checks.dataAvailability.departments > 0 &&
                checks.dataAvailability.scoreData > 0
                ? 'healthy'
                : checks.dataAvailability.universities > 0
                    ? 'degraded'
                    : 'unhealthy';
            return { status, checks };
        }
        catch (error) {
            logger_1.default.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                checks: {
                    database: false,
                    cache: false,
                    dataAvailability: {
                        universities: 0,
                        departments: 0,
                        scoreData: 0,
                    },
                },
            };
        }
    }
}
exports.DataService = DataService;
//# sourceMappingURL=DataService.js.map
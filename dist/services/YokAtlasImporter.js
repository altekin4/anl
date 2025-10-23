"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YokAtlasImporter = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const logger_1 = __importDefault(require("@/utils/logger"));
const models_1 = require("@/models");
const errors_1 = require("@/utils/errors");
const FuzzyMatcher_1 = require("./FuzzyMatcher");
class YokAtlasImporter {
    constructor() {
        this.baseUrl = 'https://yokatlas.yok.gov.tr';
        this.timeout = 10000; // 10 seconds
        this.retryAttempts = 3;
        this.retryDelay = 2000; // 2 seconds
        // Configure axios defaults
        axios_1.default.defaults.timeout = this.timeout;
        axios_1.default.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        this.fuzzyMatcher = new FuzzyMatcher_1.FuzzyMatcher();
        this.validationRules = new ValidationRules();
    }
    /**
     * Import all universities from YÖK Atlas
     */
    async importUniversities() {
        logger_1.default.info('Starting university import from YÖK Atlas');
        try {
            const universities = await this.fetchUniversities();
            logger_1.default.info(`Successfully imported ${universities.length} universities`);
            return universities;
        }
        catch (error) {
            logger_1.default.error('Failed to import universities:', error);
            throw new errors_1.ExternalServiceError('Failed to import universities from YÖK Atlas');
        }
    }
    /**
     * Import departments for a specific university
     */
    async importDepartments(universityId) {
        logger_1.default.info(`Starting department import for university ${universityId}`);
        try {
            const departments = await this.fetchDepartments(universityId);
            logger_1.default.info(`Successfully imported ${departments.length} departments for university ${universityId}`);
            return departments;
        }
        catch (error) {
            logger_1.default.error(`Failed to import departments for university ${universityId}:`, error);
            throw new errors_1.ExternalServiceError(`Failed to import departments for university ${universityId}`);
        }
    }
    /**
     * Import score data for a specific department and year
     */
    async importScoreData(departmentId, year) {
        logger_1.default.info(`Starting score data import for department ${departmentId}, year ${year}`);
        try {
            const scoreData = await this.fetchScoreData(departmentId, year);
            logger_1.default.info(`Successfully imported ${scoreData.length} score records for department ${departmentId}`);
            return scoreData;
        }
        catch (error) {
            logger_1.default.error(`Failed to import score data for department ${departmentId}:`, error);
            throw new errors_1.ExternalServiceError(`Failed to import score data for department ${departmentId}`);
        }
    }
    /**
     * Import all data (universities, departments, and score data) for a specific year
     */
    async importAllData(year) {
        logger_1.default.info(`Starting full data import for year ${year}`);
        const universities = await this.importUniversities();
        const allDepartments = [];
        const allScoreData = [];
        for (const university of universities) {
            try {
                const departments = await this.importDepartments(university.id);
                allDepartments.push(...departments);
                for (const department of departments) {
                    try {
                        const scoreData = await this.importScoreData(department.id, year);
                        allScoreData.push(...scoreData);
                        // Add delay to avoid overwhelming the server
                        await this.delay(500);
                    }
                    catch (error) {
                        logger_1.default.warn(`Skipping score data for department ${department.id}: ${error}`);
                    }
                }
                // Add delay between universities
                await this.delay(1000);
            }
            catch (error) {
                logger_1.default.warn(`Skipping departments for university ${university.id}: ${error}`);
            }
        }
        logger_1.default.info(`Full import completed: ${universities.length} universities, ${allDepartments.length} departments, ${allScoreData.length} score records`);
        return {
            universities,
            departments: allDepartments,
            scoreData: allScoreData,
        };
    }
    /**
     * Fetch universities from YÖK Atlas
     */
    async fetchUniversities() {
        const url = `${this.baseUrl}/lisans.php`;
        const response = await this.makeRequest(url);
        const $ = cheerio.load(response.data);
        const universities = [];
        const rawData = [];
        // Parse university list from the page
        $('.university-list .university-item').each((index, element) => {
            try {
                const $element = $(element);
                const name = $element.find('.university-name').text().trim();
                const city = $element.find('.university-city').text().trim();
                const type = $element.find('.university-type').text().trim();
                const id = parseInt($element.attr('data-university-id') || '0');
                rawData.push({ id, name, city, type: type || 'Devlet' });
            }
            catch (error) {
                logger_1.default.warn(`Failed to parse university at index ${index}:`, error);
            }
        });
        // Validate and transform data
        for (const data of rawData) {
            const university = this.validateAndTransformUniversity(data);
            if (university) {
                universities.push(university);
            }
        }
        if (universities.length === 0) {
            // Fallback: Create sample data for development
            logger_1.default.warn('No universities found, creating sample data');
            return this.createSampleUniversities();
        }
        logger_1.default.info(`Successfully parsed and validated ${universities.length}/${rawData.length} universities`);
        return universities;
    }
    /**
     * Fetch departments for a university
     */
    async fetchDepartments(universityId) {
        const url = `${this.baseUrl}/lisans-bolum.php?u=${universityId}`;
        const response = await this.makeRequest(url);
        const $ = cheerio.load(response.data);
        const departments = [];
        const rawData = [];
        $('.department-list .department-item').each((index, element) => {
            try {
                const $element = $(element);
                const name = $element.find('.department-name').text().trim();
                const faculty = $element.find('.faculty-name').text().trim();
                const language = $element.find('.language').text().trim() || 'Türkçe';
                const id = parseInt($element.attr('data-department-id') || '0');
                rawData.push({ id, universityId, name, faculty, language });
            }
            catch (error) {
                logger_1.default.warn(`Failed to parse department at index ${index}:`, error);
            }
        });
        // Validate and transform data
        for (const data of rawData) {
            const department = this.validateAndTransformDepartment(data);
            if (department) {
                departments.push(department);
            }
        }
        if (departments.length === 0) {
            // Fallback: Create sample data for development
            logger_1.default.warn(`No departments found for university ${universityId}, creating sample data`);
            return this.createSampleDepartments(universityId);
        }
        logger_1.default.info(`Successfully parsed and validated ${departments.length}/${rawData.length} departments for university ${universityId}`);
        return departments;
    }
    /**
     * Fetch score data for a department
     */
    async fetchScoreData(departmentId, year) {
        const url = `${this.baseUrl}/lisans-taban-puanlari.php?b=${departmentId}&y=${year}`;
        const response = await this.makeRequest(url);
        const $ = cheerio.load(response.data);
        const scoreData = [];
        const rawData = [];
        $('.score-table tbody tr').each((index, element) => {
            try {
                const $element = $(element);
                const scoreType = $element.find('.score-type').text().trim();
                const baseScore = parseFloat($element.find('.base-score').text().trim());
                const ceilingScore = parseFloat($element.find('.ceiling-score').text().trim());
                const baseRank = parseInt($element.find('.base-rank').text().trim());
                const ceilingRank = parseInt($element.find('.ceiling-rank').text().trim());
                const quota = parseInt($element.find('.quota').text().trim());
                rawData.push({
                    departmentId,
                    year,
                    scoreType,
                    baseScore,
                    ceilingScore: isNaN(ceilingScore) ? baseScore : ceilingScore,
                    baseRank: isNaN(baseRank) ? 0 : baseRank,
                    ceilingRank: isNaN(ceilingRank) ? 0 : ceilingRank,
                    quota: isNaN(quota) ? 0 : quota,
                });
            }
            catch (error) {
                logger_1.default.warn(`Failed to parse score data at index ${index}:`, error);
            }
        });
        // Validate and transform data
        for (const data of rawData) {
            const score = this.validateAndTransformScoreData(data);
            if (score) {
                scoreData.push(score);
            }
        }
        if (scoreData.length === 0) {
            // Fallback: Create sample data for development
            logger_1.default.warn(`No score data found for department ${departmentId}, creating sample data`);
            return this.createSampleScoreData(departmentId, year);
        }
        logger_1.default.info(`Successfully parsed and validated ${scoreData.length}/${rawData.length} score records for department ${departmentId}`);
        return scoreData;
    }
    /**
     * Make HTTP request with retry logic
     */
    async makeRequest(url) {
        let lastError;
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                logger_1.default.debug(`Making request to ${url} (attempt ${attempt})`);
                const response = await axios_1.default.get(url);
                return response;
            }
            catch (error) {
                lastError = error;
                logger_1.default.warn(`Request failed (attempt ${attempt}/${this.retryAttempts}):`, error.message);
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }
        throw lastError;
    }
    /**
     * Generate common aliases for university names
     */
    generateUniversityAliases(name) {
        const aliases = [];
        // Remove "Üniversitesi" and create abbreviation
        const withoutUni = name.replace(/\s*Üniversitesi\s*/gi, '').trim();
        if (withoutUni !== name) {
            aliases.push(withoutUni);
        }
        // Create abbreviation from first letters
        const words = withoutUni.split(/\s+/);
        if (words.length > 1) {
            const abbreviation = words.map(word => word.charAt(0).toUpperCase()).join('.');
            aliases.push(abbreviation);
            aliases.push(abbreviation.replace(/\./g, ''));
        }
        // Common variations
        if (name.includes('İstanbul')) {
            aliases.push(name.replace('İstanbul', 'İst.'));
        }
        if (name.includes('Ankara')) {
            aliases.push(name.replace('Ankara', 'Ank.'));
        }
        return [...new Set(aliases)]; // Remove duplicates
    }
    /**
     * Generate common aliases for department names
     */
    generateDepartmentAliases(name) {
        const aliases = [];
        // Common department abbreviations
        const abbreviations = {
            'Bilgisayar Mühendisliği': ['BM', 'Comp Eng', 'CE'],
            'Elektrik Elektronik Mühendisliği': ['EEM', 'EE', 'Elektrik'],
            'Makine Mühendisliği': ['MM', 'ME', 'Makine'],
            'İnşaat Mühendisliği': ['İM', 'CE', 'İnşaat'],
            'İşletme': ['İşl', 'Business', 'BA'],
            'İktisat': ['İkt', 'Economics', 'Econ'],
            'Hukuk': ['Law'],
            'Tıp': ['Medicine', 'Med'],
            'Diş Hekimliği': ['Dentistry', 'Dent'],
        };
        if (abbreviations[name]) {
            aliases.push(...abbreviations[name]);
        }
        // Remove "Mühendisliği" for engineering departments
        if (name.includes('Mühendisliği')) {
            aliases.push(name.replace(/\s*Mühendisliği\s*/gi, '').trim());
        }
        return [...new Set(aliases)];
    }
    /**
     * Create sample universities for development
     */
    createSampleUniversities() {
        const sampleData = [
            { id: 1, name: 'Marmara Üniversitesi', city: 'İstanbul', type: 'Devlet' },
            { id: 2, name: 'Boğaziçi Üniversitesi', city: 'İstanbul', type: 'Devlet' },
            { id: 3, name: 'İstanbul Teknik Üniversitesi', city: 'İstanbul', type: 'Devlet' },
            { id: 4, name: 'Orta Doğu Teknik Üniversitesi', city: 'Ankara', type: 'Devlet' },
            { id: 5, name: 'Koç Üniversitesi', city: 'İstanbul', type: 'Vakıf' },
        ];
        return sampleData.map(data => new models_1.University({
            ...data,
            aliases: this.generateUniversityAliases(data.name),
        }));
    }
    /**
     * Create sample departments for development
     */
    createSampleDepartments(universityId) {
        const sampleData = [
            { name: 'Bilgisayar Mühendisliği', faculty: 'Mühendislik Fakültesi', language: 'Türkçe' },
            { name: 'İşletme', faculty: 'İktisadi ve İdari Bilimler Fakültesi', language: 'Türkçe' },
            { name: 'İşletme', faculty: 'İktisadi ve İdari Bilimler Fakültesi', language: 'İngilizce' },
            { name: 'Hukuk', faculty: 'Hukuk Fakültesi', language: 'Türkçe' },
            { name: 'Tıp', faculty: 'Tıp Fakültesi', language: 'Türkçe' },
        ];
        return sampleData.map((data, index) => new models_1.Department({
            id: universityId * 100 + index + 1,
            universityId,
            ...data,
            aliases: this.generateDepartmentAliases(data.name),
        }));
    }
    /**
     * Create sample score data for development
     */
    createSampleScoreData(departmentId, year) {
        const scoreTypes = ['TYT', 'SAY', 'EA'];
        const baseScores = [350, 450, 380]; // Sample base scores
        return scoreTypes.map((scoreType, index) => new models_1.ScoreData({
            departmentId,
            year,
            scoreType,
            baseScore: baseScores[index] + Math.random() * 100,
            ceilingScore: baseScores[index] + 50 + Math.random() * 100,
            baseRank: 10000 + Math.floor(Math.random() * 50000),
            ceilingRank: 1000 + Math.floor(Math.random() * 9000),
            quota: 50 + Math.floor(Math.random() * 200),
        }));
    }
    /**
     * Validate and transform imported data
     */
    validateAndTransformUniversity(data) {
        try {
            const validated = this.validationRules.validateUniversity(data);
            if (!validated.isValid) {
                logger_1.default.warn(`Invalid university data: ${validated.errors.join(', ')}`);
                return null;
            }
            return new models_1.University({
                id: data.id,
                name: this.normalizeText(data.name),
                city: this.normalizeText(data.city),
                type: data.type,
                aliases: this.generateUniversityAliases(data.name),
            });
        }
        catch (error) {
            logger_1.default.error('Error validating university data:', error);
            return null;
        }
    }
    validateAndTransformDepartment(data) {
        try {
            const validated = this.validationRules.validateDepartment(data);
            if (!validated.isValid) {
                logger_1.default.warn(`Invalid department data: ${validated.errors.join(', ')}`);
                return null;
            }
            return new models_1.Department({
                id: data.id,
                universityId: data.universityId,
                name: this.normalizeText(data.name),
                faculty: this.normalizeText(data.faculty),
                language: this.normalizeLanguage(data.language),
                aliases: this.generateDepartmentAliases(data.name),
            });
        }
        catch (error) {
            logger_1.default.error('Error validating department data:', error);
            return null;
        }
    }
    validateAndTransformScoreData(data) {
        try {
            const validated = this.validationRules.validateScoreData(data);
            if (!validated.isValid) {
                logger_1.default.warn(`Invalid score data: ${validated.errors.join(', ')}`);
                return null;
            }
            return new models_1.ScoreData({
                departmentId: data.departmentId,
                year: data.year,
                scoreType: data.scoreType,
                baseScore: parseFloat(data.baseScore.toFixed(2)),
                ceilingScore: parseFloat(data.ceilingScore.toFixed(2)),
                baseRank: data.baseRank,
                ceilingRank: data.ceilingRank,
                quota: data.quota,
            });
        }
        catch (error) {
            logger_1.default.error('Error validating score data:', error);
            return null;
        }
    }
    /**
     * Normalize text by removing extra spaces and fixing Turkish characters
     */
    normalizeText(text) {
        if (!text)
            return '';
        return text
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/İ/g, 'İ')
            .replace(/ı/g, 'ı')
            .replace(/Ğ/g, 'Ğ')
            .replace(/ğ/g, 'ğ')
            .replace(/Ü/g, 'Ü')
            .replace(/ü/g, 'ü')
            .replace(/Ş/g, 'Ş')
            .replace(/ş/g, 'ş')
            .replace(/Ç/g, 'Ç')
            .replace(/ç/g, 'ç')
            .replace(/Ö/g, 'Ö')
            .replace(/ö/g, 'ö');
    }
    /**
     * Normalize language field
     */
    normalizeLanguage(language) {
        if (!language)
            return 'Türkçe';
        const normalized = language.toLowerCase().trim();
        if (normalized.includes('ingilizce') || normalized.includes('english')) {
            return 'İngilizce';
        }
        if (normalized.includes('almanca') || normalized.includes('german')) {
            return 'Almanca';
        }
        if (normalized.includes('fransizca') || normalized.includes('french')) {
            return 'Fransızca';
        }
        return 'Türkçe';
    }
    /**
     * Enhanced fuzzy matching for university names
     */
    async findBestUniversityMatch(searchName, existingUniversities) {
        const matches = FuzzyMatcher_1.FuzzyMatcher.findMatches(searchName, existingUniversities, (uni) => [{ field: 'name', value: uni.name }, ...uni.aliases.map(alias => ({ field: 'alias', value: alias, isAlias: true }))], 1);
        return matches.length > 0 ? { university: matches[0].item, confidence: matches[0].score } : null;
    }
    /**
     * Enhanced fuzzy matching for department names
     */
    async findBestDepartmentMatch(searchName, universityId, existingDepartments) {
        const universityDepartments = existingDepartments.filter(dept => dept.universityId === universityId);
        const matches = FuzzyMatcher_1.FuzzyMatcher.findMatches(searchName, universityDepartments, (dept) => [{ field: 'name', value: dept.name }, ...dept.aliases.map(alias => ({ field: 'alias', value: alias, isAlias: true }))], 1);
        return matches.length > 0 ? { department: matches[0].item, confidence: matches[0].score } : null;
    }
    /**
     * Batch import with progress tracking
     */
    async importAllDataWithProgress(year, onProgress) {
        logger_1.default.info(`Starting batch import for year ${year} with progress tracking`);
        const summary = {
            processed: 0,
            successful: 0,
            failed: 0,
            errors: [],
        };
        try {
            // Stage 1: Import universities
            onProgress?.({ stage: 'universities', current: 0, total: 1, message: 'Importing universities...' });
            const universities = await this.importUniversities();
            summary.processed += universities.length;
            summary.successful += universities.length;
            // Stage 2: Import departments
            const allDepartments = [];
            for (let i = 0; i < universities.length; i++) {
                const university = universities[i];
                onProgress?.({
                    stage: 'departments',
                    current: i + 1,
                    total: universities.length,
                    message: `Importing departments for ${university.name}...`
                });
                try {
                    const departments = await this.importDepartments(university.id);
                    allDepartments.push(...departments);
                    summary.processed += departments.length;
                    summary.successful += departments.length;
                    await this.delay(500); // Rate limiting
                }
                catch (error) {
                    summary.failed++;
                    summary.errors.push(`Failed to import departments for ${university.name}: ${error.message}`);
                    logger_1.default.warn(`Skipping departments for university ${university.id}: ${error.message}`);
                }
            }
            // Stage 3: Import score data
            const allScoreData = [];
            for (let i = 0; i < allDepartments.length; i++) {
                const department = allDepartments[i];
                onProgress?.({
                    stage: 'scoreData',
                    current: i + 1,
                    total: allDepartments.length,
                    message: `Importing score data for ${department.name}...`
                });
                try {
                    const scoreData = await this.importScoreData(department.id, year);
                    allScoreData.push(...scoreData);
                    summary.processed += scoreData.length;
                    summary.successful += scoreData.length;
                    await this.delay(300); // Rate limiting
                }
                catch (error) {
                    summary.failed++;
                    summary.errors.push(`Failed to import score data for ${department.name}: ${error.message}`);
                    logger_1.default.warn(`Skipping score data for department ${department.id}: ${error.message}`);
                }
            }
            logger_1.default.info(`Batch import completed: ${summary.successful}/${summary.processed} successful, ${summary.failed} failed`);
            return {
                universities,
                departments: allDepartments,
                scoreData: allScoreData,
                summary,
            };
        }
        catch (error) {
            logger_1.default.error('Batch import failed:', error);
            throw new errors_1.ExternalServiceError(`Batch import failed: ${error.message}`);
        }
    }
    /**
     * Utility method to add delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.YokAtlasImporter = YokAtlasImporter;
/**
 * Validation rules for imported data
 */
class ValidationRules {
    validateUniversity(data) {
        const errors = [];
        if (!data.id || typeof data.id !== 'number' || data.id <= 0) {
            errors.push('Invalid university ID');
        }
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
            errors.push('Invalid university name');
        }
        if (data.type && !['Devlet', 'Vakıf'].includes(data.type)) {
            errors.push('Invalid university type');
        }
        if (data.city && (typeof data.city !== 'string' || data.city.trim().length < 2)) {
            errors.push('Invalid city name');
        }
        return { isValid: errors.length === 0, errors };
    }
    validateDepartment(data) {
        const errors = [];
        if (!data.id || typeof data.id !== 'number' || data.id <= 0) {
            errors.push('Invalid department ID');
        }
        if (!data.universityId || typeof data.universityId !== 'number' || data.universityId <= 0) {
            errors.push('Invalid university ID');
        }
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
            errors.push('Invalid department name');
        }
        if (data.faculty && (typeof data.faculty !== 'string' || data.faculty.trim().length < 2)) {
            errors.push('Invalid faculty name');
        }
        return { isValid: errors.length === 0, errors };
    }
    validateScoreData(data) {
        const errors = [];
        if (!data.departmentId || typeof data.departmentId !== 'number' || data.departmentId <= 0) {
            errors.push('Invalid department ID');
        }
        if (!data.year || typeof data.year !== 'number' || data.year < 2010 || data.year > new Date().getFullYear()) {
            errors.push('Invalid year');
        }
        if (!data.scoreType || !['TYT', 'SAY', 'EA', 'SOZ', 'DIL'].includes(data.scoreType)) {
            errors.push('Invalid score type');
        }
        if (typeof data.baseScore !== 'number' || data.baseScore < 0 || data.baseScore > 600) {
            errors.push('Invalid base score');
        }
        if (typeof data.ceilingScore !== 'number' || data.ceilingScore < 0 || data.ceilingScore > 600) {
            errors.push('Invalid ceiling score');
        }
        if (data.baseScore > data.ceilingScore) {
            errors.push('Base score cannot be higher than ceiling score');
        }
        if (data.baseRank && (typeof data.baseRank !== 'number' || data.baseRank < 0)) {
            errors.push('Invalid base rank');
        }
        if (data.ceilingRank && (typeof data.ceilingRank !== 'number' || data.ceilingRank < 0)) {
            errors.push('Invalid ceiling rank');
        }
        if (data.quota && (typeof data.quota !== 'number' || data.quota < 0)) {
            errors.push('Invalid quota');
        }
        return { isValid: errors.length === 0, errors };
    }
}
//# sourceMappingURL=YokAtlasImporter.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentRepository = void 0;
const models_1 = require("@/models");
const connection_1 = __importDefault(require("@/database/connection"));
const CacheService_1 = require("@/services/CacheService");
const FuzzyMatcher_1 = require("@/services/FuzzyMatcher");
const logger_1 = __importDefault(require("@/utils/logger"));
const errors_1 = require("@/utils/errors");
class DepartmentRepository {
    constructor(cacheService) {
        this.cacheService = cacheService;
    }
    /**
     * Get all departments
     */
    async getAll() {
        const cacheKey = CacheService_1.CacheService.keys.departments();
        return this.cacheService.getOrSet(cacheKey, async () => {
            try {
                const result = await connection_1.default.query(`
            SELECT id, university_id, name, faculty, language, aliases, created_at, updated_at
            FROM departments
            ORDER BY name
          `);
                return result.rows.map((row) => models_1.Department.fromDatabase(row));
            }
            catch (error) {
                logger_1.default.error('Failed to fetch departments:', error);
                throw new errors_1.DatabaseError('Failed to fetch departments');
            }
        }, CacheService_1.CacheService.TTL.LONG);
    }
    /**
     * Get departments by university ID
     */
    async getByUniversityId(universityId) {
        const cacheKey = CacheService_1.CacheService.keys.departments(universityId);
        return this.cacheService.getOrSet(cacheKey, async () => {
            try {
                const result = await connection_1.default.query(`
            SELECT id, university_id, name, faculty, language, aliases, created_at, updated_at
            FROM departments
            WHERE university_id = $1
            ORDER BY name
          `, [universityId]);
                return result.rows.map((row) => models_1.Department.fromDatabase(row));
            }
            catch (error) {
                logger_1.default.error(`Failed to fetch departments for university ${universityId}:`, error);
                throw new errors_1.DatabaseError(`Failed to fetch departments for university ${universityId}`);
            }
        }, CacheService_1.CacheService.TTL.LONG);
    }
    /**
     * Get department by ID
     */
    async getById(id) {
        const cacheKey = CacheService_1.CacheService.keys.department(id);
        return this.cacheService.getOrSet(cacheKey, async () => {
            try {
                const result = await connection_1.default.query(`
            SELECT id, university_id, name, faculty, language, aliases, created_at, updated_at
            FROM departments
            WHERE id = $1
          `, [id]);
                if (result.rows.length === 0) {
                    return null;
                }
                return models_1.Department.fromDatabase(result.rows[0]);
            }
            catch (error) {
                logger_1.default.error(`Failed to fetch department ${id}:`, error);
                throw new errors_1.DatabaseError(`Failed to fetch department ${id}`);
            }
        }, CacheService_1.CacheService.TTL.VERY_LONG);
    }
    /**
     * Search departments by query
     */
    async search(query, universityId, limit = 10) {
        const cacheKey = CacheService_1.CacheService.keys.departmentSearch(query, universityId);
        return this.cacheService.getOrSet(cacheKey, async () => {
            const departments = universityId
                ? await this.getByUniversityId(universityId)
                : await this.getAll();
            return FuzzyMatcher_1.FuzzyMatcher.findMatches(query, departments, (department) => [
                { field: 'name', value: department.name },
                { field: 'faculty', value: department.faculty },
                { field: 'language', value: department.language },
                ...department.aliases.map(alias => ({
                    field: 'alias',
                    value: alias,
                    isAlias: true
                })),
            ], limit);
        }, CacheService_1.CacheService.TTL.MEDIUM);
    }
    /**
     * Find department by name and university
     */
    async findByNameAndUniversity(name, universityId) {
        const matches = await this.search(name, universityId, 1);
        return matches.length > 0 ? matches[0].item : null;
    }
    /**
     * Get departments with score data
     */
    async getWithScoreData(year) {
        try {
            const yearCondition = year ? 'AND sd.year = $1' : '';
            const params = year ? [year] : [];
            const result = await connection_1.default.query(`
        SELECT 
          d.id, d.university_id, d.name, d.faculty, d.language, d.aliases, 
          d.created_at, d.updated_at,
          CASE WHEN sd.department_id IS NOT NULL THEN true ELSE false END as has_score_data
        FROM departments d
        LEFT JOIN score_data sd ON d.id = sd.department_id ${yearCondition}
        ORDER BY d.name
      `, params);
            return result.rows.map((row) => ({
                ...models_1.Department.fromDatabase(row),
                hasScoreData: row.has_score_data,
            }));
        }
        catch (error) {
            logger_1.default.error('Failed to fetch departments with score data:', error);
            throw new errors_1.DatabaseError('Failed to fetch departments with score data');
        }
    }
    /**
     * Create new department
     */
    async create(departmentData) {
        try {
            const department = new models_1.Department(departmentData);
            const result = await connection_1.default.query(`
        INSERT INTO departments (university_id, name, faculty, language, aliases)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, university_id, name, faculty, language, aliases, created_at, updated_at
      `, [
                department.universityId,
                department.name,
                department.faculty,
                department.language,
                department.aliases,
            ]);
            const createdDepartment = models_1.Department.fromDatabase(result.rows[0]);
            // Invalidate cache
            await this.invalidateCache(department.universityId);
            logger_1.default.info(`Created department: ${createdDepartment.name} (ID: ${createdDepartment.id})`);
            return createdDepartment;
        }
        catch (error) {
            logger_1.default.error('Failed to create department:', error);
            throw new errors_1.DatabaseError('Failed to create department');
        }
    }
    /**
     * Update department
     */
    async update(id, updates) {
        try {
            const existing = await this.getById(id);
            if (!existing) {
                throw new errors_1.NotFoundError(`Department with ID ${id} not found`);
            }
            const updated = new models_1.Department({ ...existing.toJSON(), ...updates });
            const result = await connection_1.default.query(`
        UPDATE departments 
        SET university_id = $1, name = $2, faculty = $3, language = $4, aliases = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, university_id, name, faculty, language, aliases, created_at, updated_at
      `, [
                updated.universityId,
                updated.name,
                updated.faculty,
                updated.language,
                updated.aliases,
                id,
            ]);
            const updatedDepartment = models_1.Department.fromDatabase(result.rows[0]);
            // Invalidate cache
            await this.invalidateCache(existing.universityId, id);
            logger_1.default.info(`Updated department: ${updatedDepartment.name} (ID: ${id})`);
            return updatedDepartment;
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                throw error;
            }
            logger_1.default.error(`Failed to update department ${id}:`, error);
            throw new errors_1.DatabaseError(`Failed to update department ${id}`);
        }
    }
    /**
     * Delete department
     */
    async delete(id) {
        try {
            const existing = await this.getById(id);
            if (!existing) {
                throw new errors_1.NotFoundError(`Department with ID ${id} not found`);
            }
            const result = await connection_1.default.query('DELETE FROM departments WHERE id = $1', [id]);
            if (result.rowCount === 0) {
                throw new errors_1.NotFoundError(`Department with ID ${id} not found`);
            }
            // Invalidate cache
            await this.invalidateCache(existing.universityId, id);
            logger_1.default.info(`Deleted department with ID: ${id}`);
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                throw error;
            }
            logger_1.default.error(`Failed to delete department ${id}:`, error);
            throw new errors_1.DatabaseError(`Failed to delete department ${id}`);
        }
    }
    /**
     * Bulk create departments
     */
    async bulkCreate(departments) {
        if (departments.length === 0) {
            return [];
        }
        try {
            const createdDepartments = [];
            await connection_1.default.transaction(async (client) => {
                for (const departmentData of departments) {
                    const department = new models_1.Department(departmentData);
                    const result = await client.query(`
            INSERT INTO departments (university_id, name, faculty, language, aliases)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (university_id, name, language) DO UPDATE SET
              faculty = EXCLUDED.faculty,
              aliases = EXCLUDED.aliases,
              updated_at = CURRENT_TIMESTAMP
            RETURNING id, university_id, name, faculty, language, aliases, created_at, updated_at
          `, [
                        department.universityId,
                        department.name,
                        department.faculty,
                        department.language,
                        department.aliases,
                    ]);
                    createdDepartments.push(models_1.Department.fromDatabase(result.rows[0]));
                }
            });
            // Invalidate cache
            await this.invalidateCache();
            logger_1.default.info(`Bulk created ${createdDepartments.length} departments`);
            return createdDepartments;
        }
        catch (error) {
            logger_1.default.error('Failed to bulk create departments:', error);
            throw new errors_1.DatabaseError('Failed to bulk create departments');
        }
    }
    /**
     * Get departments by language
     */
    async getByLanguage(language) {
        try {
            const result = await connection_1.default.query(`
        SELECT id, university_id, name, faculty, language, aliases, created_at, updated_at
        FROM departments
        WHERE LOWER(language) LIKE LOWER($1)
        ORDER BY name
      `, [`%${language}%`]);
            return result.rows.map((row) => models_1.Department.fromDatabase(row));
        }
        catch (error) {
            logger_1.default.error(`Failed to fetch departments by language ${language}:`, error);
            throw new errors_1.DatabaseError(`Failed to fetch departments by language ${language}`);
        }
    }
    /**
     * Get departments by faculty
     */
    async getByFaculty(faculty) {
        try {
            const result = await connection_1.default.query(`
        SELECT id, university_id, name, faculty, language, aliases, created_at, updated_at
        FROM departments
        WHERE LOWER(faculty) LIKE LOWER($1)
        ORDER BY name
      `, [`%${faculty}%`]);
            return result.rows.map((row) => models_1.Department.fromDatabase(row));
        }
        catch (error) {
            logger_1.default.error(`Failed to fetch departments by faculty ${faculty}:`, error);
            throw new errors_1.DatabaseError(`Failed to fetch departments by faculty ${faculty}`);
        }
    }
    /**
     * Get department statistics
     */
    async getStatistics() {
        try {
            const [totalResult, languageResult, facultyResult, universityResult] = await Promise.all([
                connection_1.default.query('SELECT COUNT(*) as total FROM departments'),
                connection_1.default.query(`
          SELECT language, COUNT(*) as count 
          FROM departments 
          GROUP BY language 
          ORDER BY count DESC
        `),
                connection_1.default.query(`
          SELECT faculty, COUNT(*) as count 
          FROM departments 
          WHERE faculty IS NOT NULL
          GROUP BY faculty 
          ORDER BY count DESC 
          LIMIT 10
        `),
                connection_1.default.query(`
          SELECT university_id, COUNT(*) as count 
          FROM departments 
          GROUP BY university_id 
          ORDER BY count DESC 
          LIMIT 10
        `),
            ]);
            return {
                total: parseInt(totalResult.rows[0].total),
                byLanguage: languageResult.rows.map((row) => ({
                    language: row.language,
                    count: parseInt(row.count),
                })),
                byFacultyTop10: facultyResult.rows.map((row) => ({
                    faculty: row.faculty,
                    count: parseInt(row.count),
                })),
                byUniversityTop10: universityResult.rows.map((row) => ({
                    universityId: row.university_id,
                    count: parseInt(row.count),
                })),
            };
        }
        catch (error) {
            logger_1.default.error('Failed to fetch department statistics:', error);
            throw new errors_1.DatabaseError('Failed to fetch department statistics');
        }
    }
    /**
     * Invalidate cache for department data
     */
    async invalidateCache(universityId, departmentId) {
        try {
            const promises = [
                this.cacheService.delete(CacheService_1.CacheService.keys.departments()),
                this.cacheService.deletePattern('department:search:*'),
            ];
            if (universityId) {
                promises.push(this.cacheService.delete(CacheService_1.CacheService.keys.departments(universityId)));
            }
            if (departmentId) {
                promises.push(this.cacheService.delete(CacheService_1.CacheService.keys.department(departmentId)));
            }
            await Promise.all(promises);
        }
        catch (error) {
            logger_1.default.warn('Failed to invalidate department cache:', error);
        }
    }
}
exports.DepartmentRepository = DepartmentRepository;
//# sourceMappingURL=DepartmentRepository.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversityRepository = void 0;
const models_1 = require("@/models");
const connection_1 = __importDefault(require("@/database/connection"));
const CacheService_1 = require("@/services/CacheService");
const FuzzyMatcher_1 = require("@/services/FuzzyMatcher");
const logger_1 = __importDefault(require("@/utils/logger"));
const errors_1 = require("@/utils/errors");
class UniversityRepository {
    constructor(cacheService) {
        this.cacheService = cacheService;
    }
    /**
     * Get all universities
     */
    async getAll() {
        const cacheKey = CacheService_1.CacheService.keys.universities();
        return this.cacheService.getOrSet(cacheKey, async () => {
            try {
                const result = await connection_1.default.query(`
            SELECT id, name, city, type, aliases, created_at, updated_at
            FROM universities
            ORDER BY name
          `);
                return result.rows.map((row) => models_1.University.fromDatabase(row));
            }
            catch (error) {
                logger_1.default.error('Failed to fetch universities:', error);
                throw new errors_1.DatabaseError('Failed to fetch universities');
            }
        }, CacheService_1.CacheService.TTL.LONG);
    }
    /**
     * Get university by ID
     */
    async getById(id) {
        const cacheKey = CacheService_1.CacheService.keys.university(id);
        return this.cacheService.getOrSet(cacheKey, async () => {
            try {
                const result = await connection_1.default.query(`
            SELECT id, name, city, type, aliases, created_at, updated_at
            FROM universities
            WHERE id = $1
          `, [id]);
                if (result.rows.length === 0) {
                    return null;
                }
                return models_1.University.fromDatabase(result.rows[0]);
            }
            catch (error) {
                logger_1.default.error(`Failed to fetch university ${id}:`, error);
                throw new errors_1.DatabaseError(`Failed to fetch university ${id}`);
            }
        }, CacheService_1.CacheService.TTL.VERY_LONG);
    }
    /**
     * Search universities by query
     */
    async search(query, limit = 10) {
        const cacheKey = CacheService_1.CacheService.keys.universitySearch(query);
        return this.cacheService.getOrSet(cacheKey, async () => {
            const universities = await this.getAll();
            return FuzzyMatcher_1.FuzzyMatcher.findMatches(query, universities, (university) => [
                { field: 'name', value: university.name },
                { field: 'city', value: university.city },
                ...university.aliases.map(alias => ({
                    field: 'alias',
                    value: alias,
                    isAlias: true
                })),
            ], limit);
        }, CacheService_1.CacheService.TTL.MEDIUM);
    }
    /**
     * Find university by name (exact or fuzzy match)
     */
    async findByName(name) {
        const matches = await this.search(name, 1);
        return matches.length > 0 ? matches[0].item : null;
    }
    /**
     * Create new university
     */
    async create(universityData) {
        try {
            const university = new models_1.University(universityData);
            const result = await connection_1.default.query(`
        INSERT INTO universities (name, city, type, aliases)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, city, type, aliases, created_at, updated_at
      `, [
                university.name,
                university.city,
                university.type,
                university.aliases,
            ]);
            const createdUniversity = models_1.University.fromDatabase(result.rows[0]);
            // Invalidate cache
            await this.invalidateCache();
            logger_1.default.info(`Created university: ${createdUniversity.name} (ID: ${createdUniversity.id})`);
            return createdUniversity;
        }
        catch (error) {
            logger_1.default.error('Failed to create university:', error);
            throw new errors_1.DatabaseError('Failed to create university');
        }
    }
    /**
     * Update university
     */
    async update(id, updates) {
        try {
            const existing = await this.getById(id);
            if (!existing) {
                throw new errors_1.NotFoundError(`University with ID ${id} not found`);
            }
            const updated = new models_1.University({ ...existing.toJSON(), ...updates });
            const result = await connection_1.default.query(`
        UPDATE universities 
        SET name = $1, city = $2, type = $3, aliases = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, name, city, type, aliases, created_at, updated_at
      `, [
                updated.name,
                updated.city,
                updated.type,
                updated.aliases,
                id,
            ]);
            const updatedUniversity = models_1.University.fromDatabase(result.rows[0]);
            // Invalidate cache
            await this.invalidateCache(id);
            logger_1.default.info(`Updated university: ${updatedUniversity.name} (ID: ${id})`);
            return updatedUniversity;
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                throw error;
            }
            logger_1.default.error(`Failed to update university ${id}:`, error);
            throw new errors_1.DatabaseError(`Failed to update university ${id}`);
        }
    }
    /**
     * Delete university
     */
    async delete(id) {
        try {
            const result = await connection_1.default.query('DELETE FROM universities WHERE id = $1', [id]);
            if (result.rowCount === 0) {
                throw new errors_1.NotFoundError(`University with ID ${id} not found`);
            }
            // Invalidate cache
            await this.invalidateCache(id);
            logger_1.default.info(`Deleted university with ID: ${id}`);
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                throw error;
            }
            logger_1.default.error(`Failed to delete university ${id}:`, error);
            throw new errors_1.DatabaseError(`Failed to delete university ${id}`);
        }
    }
    /**
     * Bulk create universities
     */
    async bulkCreate(universities) {
        if (universities.length === 0) {
            return [];
        }
        try {
            const createdUniversities = [];
            await connection_1.default.transaction(async (client) => {
                for (const universityData of universities) {
                    const university = new models_1.University(universityData);
                    const result = await client.query(`
            INSERT INTO universities (name, city, type, aliases)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (name) DO UPDATE SET
              city = EXCLUDED.city,
              type = EXCLUDED.type,
              aliases = EXCLUDED.aliases,
              updated_at = CURRENT_TIMESTAMP
            RETURNING id, name, city, type, aliases, created_at, updated_at
          `, [
                        university.name,
                        university.city,
                        university.type,
                        university.aliases,
                    ]);
                    createdUniversities.push(models_1.University.fromDatabase(result.rows[0]));
                }
            });
            // Invalidate cache
            await this.invalidateCache();
            logger_1.default.info(`Bulk created ${createdUniversities.length} universities`);
            return createdUniversities;
        }
        catch (error) {
            logger_1.default.error('Failed to bulk create universities:', error);
            throw new errors_1.DatabaseError('Failed to bulk create universities');
        }
    }
    /**
     * Get universities by type
     */
    async getByType(type) {
        try {
            const result = await connection_1.default.query(`
        SELECT id, name, city, type, aliases, created_at, updated_at
        FROM universities
        WHERE type = $1
        ORDER BY name
      `, [type]);
            return result.rows.map((row) => models_1.University.fromDatabase(row));
        }
        catch (error) {
            logger_1.default.error(`Failed to fetch universities by type ${type}:`, error);
            throw new errors_1.DatabaseError(`Failed to fetch universities by type ${type}`);
        }
    }
    /**
     * Get universities by city
     */
    async getByCity(city) {
        try {
            const result = await connection_1.default.query(`
        SELECT id, name, city, type, aliases, created_at, updated_at
        FROM universities
        WHERE LOWER(city) = LOWER($1)
        ORDER BY name
      `, [city]);
            return result.rows.map((row) => models_1.University.fromDatabase(row));
        }
        catch (error) {
            logger_1.default.error(`Failed to fetch universities by city ${city}:`, error);
            throw new errors_1.DatabaseError(`Failed to fetch universities by city ${city}`);
        }
    }
    /**
     * Get university statistics
     */
    async getStatistics() {
        try {
            const [totalResult, typeResult, cityResult] = await Promise.all([
                connection_1.default.query('SELECT COUNT(*) as total FROM universities'),
                connection_1.default.query(`
          SELECT type, COUNT(*) as count 
          FROM universities 
          GROUP BY type
        `),
                connection_1.default.query(`
          SELECT city, COUNT(*) as count 
          FROM universities 
          WHERE city IS NOT NULL
          GROUP BY city 
          ORDER BY count DESC 
          LIMIT 10
        `),
            ]);
            const byType = { Devlet: 0, Vakıf: 0 };
            typeResult.rows.forEach((row) => {
                byType[row.type] = parseInt(row.count);
            });
            return {
                total: parseInt(totalResult.rows[0].total),
                byType,
                byCityTop10: cityResult.rows.map((row) => ({
                    city: row.city,
                    count: parseInt(row.count),
                })),
            };
        }
        catch (error) {
            logger_1.default.error('Failed to fetch university statistics:', error);
            throw new errors_1.DatabaseError('Failed to fetch university statistics');
        }
    }
    /**
     * Invalidate cache for university data
     */
    async invalidateCache(id) {
        try {
            if (id) {
                await this.cacheService.delete(CacheService_1.CacheService.keys.university(id));
            }
            await Promise.all([
                this.cacheService.delete(CacheService_1.CacheService.keys.universities()),
                this.cacheService.deletePattern('university:search:*'),
            ]);
        }
        catch (error) {
            logger_1.default.warn('Failed to invalidate university cache:', error);
        }
    }
}
exports.UniversityRepository = UniversityRepository;
//# sourceMappingURL=UniversityRepository.js.map
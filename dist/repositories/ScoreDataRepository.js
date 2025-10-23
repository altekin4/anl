"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreDataRepository = void 0;
const models_1 = require("@/models");
const connection_1 = __importDefault(require("@/database/connection"));
const CacheService_1 = require("@/services/CacheService");
const logger_1 = __importDefault(require("@/utils/logger"));
const errors_1 = require("@/utils/errors");
class ScoreDataRepository {
    constructor(cacheService) {
        this.cacheService = cacheService;
    }
    /**
     * Get score data by department ID and year
     */
    async getByDepartmentAndYear(departmentId, year) {
        const cacheKey = CacheService_1.CacheService.keys.scoreData(departmentId, year);
        return this.cacheService.getOrSet(cacheKey, async () => {
            try {
                const query = year
                    ? `SELECT * FROM score_data WHERE department_id = $1 AND year = $2 ORDER BY score_type`
                    : `SELECT * FROM score_data WHERE department_id = $1 ORDER BY year DESC, score_type`;
                const params = year ? [departmentId, year] : [departmentId];
                const result = await connection_1.default.query(query, params);
                return result.rows.map((row) => models_1.ScoreData.fromDatabase(row));
            }
            catch (error) {
                logger_1.default.error(`Failed to fetch score data for department ${departmentId}:`, error);
                throw new errors_1.DatabaseError(`Failed to fetch score data for department ${departmentId}`);
            }
        }, CacheService_1.CacheService.TTL.LONG);
    }
    /**
     * Get score data by ID
     */
    async getById(id) {
        try {
            const result = await connection_1.default.query(`
        SELECT * FROM score_data WHERE id = $1
      `, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            return models_1.ScoreData.fromDatabase(result.rows[0]);
        }
        catch (error) {
            logger_1.default.error(`Failed to fetch score data ${id}:`, error);
            throw new errors_1.DatabaseError(`Failed to fetch score data ${id}`);
        }
    }
    /**
     * Get latest score data for a department
     */
    async getLatestByDepartment(departmentId) {
        try {
            const result = await connection_1.default.query(`
        SELECT sd.* 
        FROM score_data sd
        INNER JOIN (
          SELECT department_id, MAX(year) as max_year
          FROM score_data
          WHERE department_id = $1
          GROUP BY department_id
        ) latest ON sd.department_id = latest.department_id AND sd.year = latest.max_year
        WHERE sd.department_id = $1
        ORDER BY sd.score_type
      `, [departmentId]);
            return result.rows.map((row) => models_1.ScoreData.fromDatabase(row));
        }
        catch (error) {
            logger_1.default.error(`Failed to fetch latest score data for department ${departmentId}:`, error);
            throw new errors_1.DatabaseError(`Failed to fetch latest score data for department ${departmentId}`);
        }
    }
    /**
     * Get score data by score type and year
     */
    async getByScoreTypeAndYear(scoreType, year, limit = 100) {
        try {
            const result = await connection_1.default.query(`
        SELECT * FROM score_data 
        WHERE score_type = $1 AND year = $2 
        ORDER BY base_score DESC 
        LIMIT $3
      `, [scoreType, year, limit]);
            return result.rows.map((row) => models_1.ScoreData.fromDatabase(row));
        }
        catch (error) {
            logger_1.default.error(`Failed to fetch score data by type ${scoreType} and year ${year}:`, error);
            throw new errors_1.DatabaseError(`Failed to fetch score data by type ${scoreType} and year ${year}`);
        }
    }
    /**
     * Get departments by score range
     */
    async getDepartmentsByScoreRange(scoreType, minScore, maxScore, year, limit = 50) {
        try {
            const yearCondition = year ? 'AND year = $4' : '';
            const params = year ? [scoreType, minScore, maxScore, year, limit] : [scoreType, minScore, maxScore, limit];
            const limitParam = year ? '$5' : '$4';
            const result = await connection_1.default.query(`
        SELECT * FROM score_data 
        WHERE score_type = $1 
        AND base_score >= $2 
        AND base_score <= $3 
        ${yearCondition}
        ORDER BY base_score ASC 
        LIMIT ${limitParam}
      `, params);
            return result.rows.map((row) => models_1.ScoreData.fromDatabase(row));
        }
        catch (error) {
            logger_1.default.error(`Failed to fetch departments by score range:`, error);
            throw new errors_1.DatabaseError('Failed to fetch departments by score range');
        }
    }
    /**
     * Create new score data
     */
    async create(scoreDataInput) {
        try {
            const scoreData = new models_1.ScoreData(scoreDataInput);
            const result = await connection_1.default.query(`
        INSERT INTO score_data (department_id, year, score_type, base_score, ceiling_score, base_rank, ceiling_rank, quota)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
                scoreData.departmentId,
                scoreData.year,
                scoreData.scoreType,
                scoreData.baseScore,
                scoreData.ceilingScore,
                scoreData.baseRank,
                scoreData.ceilingRank,
                scoreData.quota,
            ]);
            const createdScoreData = models_1.ScoreData.fromDatabase(result.rows[0]);
            // Invalidate cache
            await this.invalidateCache(scoreData.departmentId);
            logger_1.default.info(`Created score data for department ${scoreData.departmentId}, year ${scoreData.year}, type ${scoreData.scoreType}`);
            return createdScoreData;
        }
        catch (error) {
            logger_1.default.error('Failed to create score data:', error);
            throw new errors_1.DatabaseError('Failed to create score data');
        }
    }
    /**
     * Update score data
     */
    async update(id, updates) {
        try {
            const existing = await this.getById(id);
            if (!existing) {
                throw new errors_1.NotFoundError(`Score data with ID ${id} not found`);
            }
            const updated = new models_1.ScoreData({ ...existing.toJSON(), ...updates });
            const result = await connection_1.default.query(`
        UPDATE score_data 
        SET department_id = $1, year = $2, score_type = $3, base_score = $4, 
            ceiling_score = $5, base_rank = $6, ceiling_rank = $7, quota = $8
        WHERE id = $9
        RETURNING *
      `, [
                updated.departmentId,
                updated.year,
                updated.scoreType,
                updated.baseScore,
                updated.ceilingScore,
                updated.baseRank,
                updated.ceilingRank,
                updated.quota,
                id,
            ]);
            const updatedScoreData = models_1.ScoreData.fromDatabase(result.rows[0]);
            // Invalidate cache
            await this.invalidateCache(existing.departmentId);
            logger_1.default.info(`Updated score data with ID: ${id}`);
            return updatedScoreData;
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                throw error;
            }
            logger_1.default.error(`Failed to update score data ${id}:`, error);
            throw new errors_1.DatabaseError(`Failed to update score data ${id}`);
        }
    }
    /**
     * Delete score data
     */
    async delete(id) {
        try {
            const existing = await this.getById(id);
            if (!existing) {
                throw new errors_1.NotFoundError(`Score data with ID ${id} not found`);
            }
            const result = await connection_1.default.query('DELETE FROM score_data WHERE id = $1', [id]);
            if (result.rowCount === 0) {
                throw new errors_1.NotFoundError(`Score data with ID ${id} not found`);
            }
            // Invalidate cache
            await this.invalidateCache(existing.departmentId);
            logger_1.default.info(`Deleted score data with ID: ${id}`);
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                throw error;
            }
            logger_1.default.error(`Failed to delete score data ${id}:`, error);
            throw new errors_1.DatabaseError(`Failed to delete score data ${id}`);
        }
    }
    /**
     * Bulk create score data
     */
    async bulkCreate(scoreDataList) {
        if (scoreDataList.length === 0) {
            return [];
        }
        try {
            const createdScoreData = [];
            await connection_1.default.transaction(async (client) => {
                for (const scoreDataInput of scoreDataList) {
                    const scoreData = new models_1.ScoreData(scoreDataInput);
                    const result = await client.query(`
            INSERT INTO score_data (department_id, year, score_type, base_score, ceiling_score, base_rank, ceiling_rank, quota)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (department_id, year, score_type) DO UPDATE SET
              base_score = EXCLUDED.base_score,
              ceiling_score = EXCLUDED.ceiling_score,
              base_rank = EXCLUDED.base_rank,
              ceiling_rank = EXCLUDED.ceiling_rank,
              quota = EXCLUDED.quota
            RETURNING *
          `, [
                        scoreData.departmentId,
                        scoreData.year,
                        scoreData.scoreType,
                        scoreData.baseScore,
                        scoreData.ceilingScore,
                        scoreData.baseRank,
                        scoreData.ceilingRank,
                        scoreData.quota,
                    ]);
                    createdScoreData.push(models_1.ScoreData.fromDatabase(result.rows[0]));
                }
            });
            // Invalidate cache for all affected departments
            const departmentIds = [...new Set(scoreDataList.map(sd => sd.departmentId))];
            await Promise.all(departmentIds.map(id => id ? this.invalidateCache(id) : Promise.resolve()));
            logger_1.default.info(`Bulk created ${createdScoreData.length} score data records`);
            return createdScoreData;
        }
        catch (error) {
            logger_1.default.error('Failed to bulk create score data:', error);
            throw new errors_1.DatabaseError('Failed to bulk create score data');
        }
    }
    /**
     * Get available years for score data
     */
    async getAvailableYears() {
        try {
            const result = await connection_1.default.query(`
        SELECT DISTINCT year 
        FROM score_data 
        ORDER BY year DESC
      `);
            return result.rows.map((row) => row.year);
        }
        catch (error) {
            logger_1.default.error('Failed to fetch available years:', error);
            throw new errors_1.DatabaseError('Failed to fetch available years');
        }
    }
    /**
     * Get score data statistics
     */
    async getStatistics(year) {
        try {
            const yearCondition = year ? 'WHERE year = $1' : '';
            const params = year ? [year] : [];
            const [totalResult, typeResult, yearResult, rangeResult] = await Promise.all([
                connection_1.default.query(`SELECT COUNT(*) as total FROM score_data ${yearCondition}`, params),
                connection_1.default.query(`
          SELECT score_type, COUNT(*) as count, AVG(base_score) as avg_base_score
          FROM score_data ${yearCondition}
          GROUP BY score_type
          ORDER BY score_type
        `, params),
                connection_1.default.query(`
          SELECT year, COUNT(*) as count 
          FROM score_data 
          GROUP BY year 
          ORDER BY year DESC
        `),
                connection_1.default.query(`
          SELECT score_type, MIN(base_score) as min_score, MAX(base_score) as max_score, AVG(base_score) as avg_score
          FROM score_data ${yearCondition}
          GROUP BY score_type
          ORDER BY score_type
        `, params),
            ]);
            return {
                totalRecords: parseInt(totalResult.rows[0].total),
                byScoreType: typeResult.rows.map((row) => ({
                    scoreType: row.score_type,
                    count: parseInt(row.count),
                    avgBaseScore: parseFloat(row.avg_base_score),
                })),
                byYear: yearResult.rows.map((row) => ({
                    year: row.year,
                    count: parseInt(row.count),
                })),
                scoreRanges: rangeResult.rows.map((row) => ({
                    scoreType: row.score_type,
                    minScore: parseFloat(row.min_score),
                    maxScore: parseFloat(row.max_score),
                    avgScore: parseFloat(row.avg_score),
                })),
            };
        }
        catch (error) {
            logger_1.default.error('Failed to fetch score data statistics:', error);
            throw new errors_1.DatabaseError('Failed to fetch score data statistics');
        }
    }
    /**
     * Delete score data by year
     */
    async deleteByYear(year) {
        try {
            const result = await connection_1.default.query('DELETE FROM score_data WHERE year = $1', [year]);
            // Invalidate all score data cache
            await this.cacheService.deletePattern('score:*');
            logger_1.default.info(`Deleted ${result.rowCount} score data records for year ${year}`);
            return result.rowCount || 0;
        }
        catch (error) {
            logger_1.default.error(`Failed to delete score data for year ${year}:`, error);
            throw new errors_1.DatabaseError(`Failed to delete score data for year ${year}`);
        }
    }
    /**
     * Invalidate cache for score data
     */
    async invalidateCache(departmentId) {
        try {
            await Promise.all([
                this.cacheService.deletePattern(`score:${departmentId}*`),
                this.cacheService.deletePattern('net:*'), // Also invalidate net calculation cache
            ]);
        }
        catch (error) {
            logger_1.default.warn('Failed to invalidate score data cache:', error);
        }
    }
}
exports.ScoreDataRepository = ScoreDataRepository;
//# sourceMappingURL=ScoreDataRepository.js.map
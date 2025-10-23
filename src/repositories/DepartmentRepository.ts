import { Department } from '@/models';
import db from '@/database/connection';
import { CacheService } from '@/services/CacheService';
import { FuzzyMatcher, MatchResult } from '@/services/FuzzyMatcher';
import logger from '@/utils/logger';
import { DatabaseError, NotFoundError } from '@/utils/errors';

export class DepartmentRepository {
  constructor(private cacheService: CacheService) {}

  /**
   * Get all departments
   */
  async getAll(): Promise<Department[]> {
    const cacheKey = CacheService.keys.departments();
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const result = await db.query(`
            SELECT id, university_id, name, faculty, language, aliases, created_at, updated_at
            FROM departments
            ORDER BY name
          `);

          return result.rows.map((row: any) => Department.fromDatabase(row));
        } catch (error) {
          logger.error('Failed to fetch departments:', error);
          throw new DatabaseError('Failed to fetch departments');
        }
      },
      CacheService.TTL.LONG
    );
  }

  /**
   * Get departments by university ID
   */
  async getByUniversityId(universityId: number): Promise<Department[]> {
    const cacheKey = CacheService.keys.departments(universityId);
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const result = await db.query(`
            SELECT id, university_id, name, faculty, language, aliases, created_at, updated_at
            FROM departments
            WHERE university_id = $1
            ORDER BY name
          `, [universityId]);

          return result.rows.map((row: any) => Department.fromDatabase(row));
        } catch (error) {
          logger.error(`Failed to fetch departments for university ${universityId}:`, error);
          throw new DatabaseError(`Failed to fetch departments for university ${universityId}`);
        }
      },
      CacheService.TTL.LONG
    );
  }

  /**
   * Get department by ID
   */
  async getById(id: number): Promise<Department | null> {
    const cacheKey = CacheService.keys.department(id);
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const result = await db.query(`
            SELECT id, university_id, name, faculty, language, aliases, created_at, updated_at
            FROM departments
            WHERE id = $1
          `, [id]);

          if (result.rows.length === 0) {
            return null;
          }

          return Department.fromDatabase(result.rows[0]);
        } catch (error) {
          logger.error(`Failed to fetch department ${id}:`, error);
          throw new DatabaseError(`Failed to fetch department ${id}`);
        }
      },
      CacheService.TTL.VERY_LONG
    );
  }

  /**
   * Search departments by query
   */
  async search(query: string, universityId?: number, limit: number = 10): Promise<MatchResult<Department>[]> {
    const cacheKey = CacheService.keys.departmentSearch(query, universityId);
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const departments = universityId 
          ? await this.getByUniversityId(universityId)
          : await this.getAll();
        
        return FuzzyMatcher.findMatches(
          query,
          departments,
          (department) => [
            { field: 'name', value: department.name },
            { field: 'faculty', value: department.faculty },
            { field: 'language', value: department.language },
            ...department.aliases.map(alias => ({ 
              field: 'alias', 
              value: alias, 
              isAlias: true 
            })),
          ],
          limit
        );
      },
      CacheService.TTL.MEDIUM
    );
  }

  /**
   * Find department by name and university
   */
  async findByNameAndUniversity(name: string, universityId: number): Promise<Department | null> {
    const matches = await this.search(name, universityId, 1);
    return matches.length > 0 ? matches[0].item : null;
  }

  /**
   * Get departments with score data
   */
  async getWithScoreData(year?: number): Promise<Array<Department & { hasScoreData: boolean }>> {
    try {
      const yearCondition = year ? 'AND sd.year = $1' : '';
      const params = year ? [year] : [];

      const result = await db.query(`
        SELECT 
          d.id, d.university_id, d.name, d.faculty, d.language, d.aliases, 
          d.created_at, d.updated_at,
          CASE WHEN sd.department_id IS NOT NULL THEN true ELSE false END as has_score_data
        FROM departments d
        LEFT JOIN score_data sd ON d.id = sd.department_id ${yearCondition}
        ORDER BY d.name
      `, params);

      return result.rows.map((row: any) => ({
        ...Department.fromDatabase(row),
        hasScoreData: row.has_score_data,
      }));
    } catch (error) {
      logger.error('Failed to fetch departments with score data:', error);
      throw new DatabaseError('Failed to fetch departments with score data');
    }
  }

  /**
   * Create new department
   */
  async create(departmentData: Partial<Department>): Promise<Department> {
    try {
      const department = new Department(departmentData);
      
      const result = await db.query(`
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

      const createdDepartment = Department.fromDatabase(result.rows[0]);
      
      // Invalidate cache
      await this.invalidateCache(department.universityId);
      
      logger.info(`Created department: ${createdDepartment.name} (ID: ${createdDepartment.id})`);
      return createdDepartment;
    } catch (error) {
      logger.error('Failed to create department:', error);
      throw new DatabaseError('Failed to create department');
    }
  }

  /**
   * Update department
   */
  async update(id: number, updates: Partial<Department>): Promise<Department> {
    try {
      const existing = await this.getById(id);
      if (!existing) {
        throw new NotFoundError(`Department with ID ${id} not found`);
      }

      const updated = new Department({ ...existing.toJSON(), ...updates });
      
      const result = await db.query(`
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

      const updatedDepartment = Department.fromDatabase(result.rows[0]);
      
      // Invalidate cache
      await this.invalidateCache(existing.universityId, id);
      
      logger.info(`Updated department: ${updatedDepartment.name} (ID: ${id})`);
      return updatedDepartment;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Failed to update department ${id}:`, error);
      throw new DatabaseError(`Failed to update department ${id}`);
    }
  }

  /**
   * Delete department
   */
  async delete(id: number): Promise<void> {
    try {
      const existing = await this.getById(id);
      if (!existing) {
        throw new NotFoundError(`Department with ID ${id} not found`);
      }

      const result = await db.query('DELETE FROM departments WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError(`Department with ID ${id} not found`);
      }

      // Invalidate cache
      await this.invalidateCache(existing.universityId, id);
      
      logger.info(`Deleted department with ID: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Failed to delete department ${id}:`, error);
      throw new DatabaseError(`Failed to delete department ${id}`);
    }
  }

  /**
   * Bulk create departments
   */
  async bulkCreate(departments: Partial<Department>[]): Promise<Department[]> {
    if (departments.length === 0) {
      return [];
    }

    try {
      const createdDepartments: Department[] = [];
      
      await db.transaction(async (client) => {
        for (const departmentData of departments) {
          const department = new Department(departmentData);
          
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

          createdDepartments.push(Department.fromDatabase(result.rows[0]));
        }
      });

      // Invalidate cache
      await this.invalidateCache();
      
      logger.info(`Bulk created ${createdDepartments.length} departments`);
      return createdDepartments;
    } catch (error) {
      logger.error('Failed to bulk create departments:', error);
      throw new DatabaseError('Failed to bulk create departments');
    }
  }

  /**
   * Get departments by language
   */
  async getByLanguage(language: string): Promise<Department[]> {
    try {
      const result = await db.query(`
        SELECT id, university_id, name, faculty, language, aliases, created_at, updated_at
        FROM departments
        WHERE LOWER(language) LIKE LOWER($1)
        ORDER BY name
      `, [`%${language}%`]);

      return result.rows.map((row: any) => Department.fromDatabase(row));
    } catch (error) {
      logger.error(`Failed to fetch departments by language ${language}:`, error);
      throw new DatabaseError(`Failed to fetch departments by language ${language}`);
    }
  }

  /**
   * Get departments by faculty
   */
  async getByFaculty(faculty: string): Promise<Department[]> {
    try {
      const result = await db.query(`
        SELECT id, university_id, name, faculty, language, aliases, created_at, updated_at
        FROM departments
        WHERE LOWER(faculty) LIKE LOWER($1)
        ORDER BY name
      `, [`%${faculty}%`]);

      return result.rows.map((row: any) => Department.fromDatabase(row));
    } catch (error) {
      logger.error(`Failed to fetch departments by faculty ${faculty}:`, error);
      throw new DatabaseError(`Failed to fetch departments by faculty ${faculty}`);
    }
  }

  /**
   * Get department statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byLanguage: { language: string; count: number }[];
    byFacultyTop10: { faculty: string; count: number }[];
    byUniversityTop10: { universityId: number; count: number }[];
  }> {
    try {
      const [totalResult, languageResult, facultyResult, universityResult] = await Promise.all([
        db.query('SELECT COUNT(*) as total FROM departments'),
        db.query(`
          SELECT language, COUNT(*) as count 
          FROM departments 
          GROUP BY language 
          ORDER BY count DESC
        `),
        db.query(`
          SELECT faculty, COUNT(*) as count 
          FROM departments 
          WHERE faculty IS NOT NULL
          GROUP BY faculty 
          ORDER BY count DESC 
          LIMIT 10
        `),
        db.query(`
          SELECT university_id, COUNT(*) as count 
          FROM departments 
          GROUP BY university_id 
          ORDER BY count DESC 
          LIMIT 10
        `),
      ]);

      return {
        total: parseInt(totalResult.rows[0].total),
        byLanguage: languageResult.rows.map((row: any) => ({
          language: row.language,
          count: parseInt(row.count),
        })),
        byFacultyTop10: facultyResult.rows.map((row: any) => ({
          faculty: row.faculty,
          count: parseInt(row.count),
        })),
        byUniversityTop10: universityResult.rows.map((row: any) => ({
          universityId: row.university_id,
          count: parseInt(row.count),
        })),
      };
    } catch (error) {
      logger.error('Failed to fetch department statistics:', error);
      throw new DatabaseError('Failed to fetch department statistics');
    }
  }

  /**
   * Invalidate cache for department data
   */
  private async invalidateCache(universityId?: number, departmentId?: number): Promise<void> {
    try {
      const promises: Promise<void>[] = [
        this.cacheService.delete(CacheService.keys.departments()),
        this.cacheService.deletePattern('department:search:*'),
      ];

      if (universityId) {
        promises.push(this.cacheService.delete(CacheService.keys.departments(universityId)));
      }

      if (departmentId) {
        promises.push(this.cacheService.delete(CacheService.keys.department(departmentId)));
      }

      await Promise.all(promises);
    } catch (error) {
      logger.warn('Failed to invalidate department cache:', error);
    }
  }
}
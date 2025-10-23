import { University } from '@/models';
import { IDataService } from '@/types';
import db from '@/database/connection';
import { CacheService } from '@/services/CacheService';
import { FuzzyMatcher, MatchResult } from '@/services/FuzzyMatcher';
import logger from '@/utils/logger';
import { DatabaseError, NotFoundError } from '@/utils/errors';

export class UniversityRepository {
  constructor(private cacheService: CacheService) {}

  /**
   * Get all universities
   */
  async getAll(): Promise<University[]> {
    const cacheKey = CacheService.keys.universities();
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const result = await db.query(`
            SELECT id, name, city, type, aliases, created_at, updated_at
            FROM universities
            ORDER BY name
          `);

          return result.rows.map((row: any) => University.fromDatabase(row));
        } catch (error) {
          logger.error('Failed to fetch universities:', error);
          throw new DatabaseError('Failed to fetch universities');
        }
      },
      CacheService.TTL.LONG
    );
  }

  /**
   * Get university by ID
   */
  async getById(id: number): Promise<University | null> {
    const cacheKey = CacheService.keys.university(id);
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const result = await db.query(`
            SELECT id, name, city, type, aliases, created_at, updated_at
            FROM universities
            WHERE id = $1
          `, [id]);

          if (result.rows.length === 0) {
            return null;
          }

          return University.fromDatabase(result.rows[0]);
        } catch (error) {
          logger.error(`Failed to fetch university ${id}:`, error);
          throw new DatabaseError(`Failed to fetch university ${id}`);
        }
      },
      CacheService.TTL.VERY_LONG
    );
  }

  /**
   * Search universities by query
   */
  async search(query: string, limit: number = 10): Promise<MatchResult<University>[]> {
    const cacheKey = CacheService.keys.universitySearch(query);
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const universities = await this.getAll();
        
        return FuzzyMatcher.findMatches(
          query,
          universities,
          (university) => [
            { field: 'name', value: university.name },
            { field: 'city', value: university.city },
            ...university.aliases.map(alias => ({ 
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
   * Find university by name (exact or fuzzy match)
   */
  async findByName(name: string): Promise<University | null> {
    const matches = await this.search(name, 1);
    return matches.length > 0 ? matches[0].item : null;
  }

  /**
   * Create new university
   */
  async create(universityData: Partial<University>): Promise<University> {
    try {
      const university = new University(universityData);
      
      const result = await db.query(`
        INSERT INTO universities (name, city, type, aliases)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, city, type, aliases, created_at, updated_at
      `, [
        university.name,
        university.city,
        university.type,
        university.aliases,
      ]);

      const createdUniversity = University.fromDatabase(result.rows[0]);
      
      // Invalidate cache
      await this.invalidateCache();
      
      logger.info(`Created university: ${createdUniversity.name} (ID: ${createdUniversity.id})`);
      return createdUniversity;
    } catch (error) {
      logger.error('Failed to create university:', error);
      throw new DatabaseError('Failed to create university');
    }
  }

  /**
   * Update university
   */
  async update(id: number, updates: Partial<University>): Promise<University> {
    try {
      const existing = await this.getById(id);
      if (!existing) {
        throw new NotFoundError(`University with ID ${id} not found`);
      }

      const updated = new University({ ...existing.toJSON(), ...updates });
      
      const result = await db.query(`
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

      const updatedUniversity = University.fromDatabase(result.rows[0]);
      
      // Invalidate cache
      await this.invalidateCache(id);
      
      logger.info(`Updated university: ${updatedUniversity.name} (ID: ${id})`);
      return updatedUniversity;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Failed to update university ${id}:`, error);
      throw new DatabaseError(`Failed to update university ${id}`);
    }
  }

  /**
   * Delete university
   */
  async delete(id: number): Promise<void> {
    try {
      const result = await db.query('DELETE FROM universities WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError(`University with ID ${id} not found`);
      }

      // Invalidate cache
      await this.invalidateCache(id);
      
      logger.info(`Deleted university with ID: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Failed to delete university ${id}:`, error);
      throw new DatabaseError(`Failed to delete university ${id}`);
    }
  }

  /**
   * Bulk create universities
   */
  async bulkCreate(universities: Partial<University>[]): Promise<University[]> {
    if (universities.length === 0) {
      return [];
    }

    try {
      const createdUniversities: University[] = [];
      
      await db.transaction(async (client) => {
        for (const universityData of universities) {
          const university = new University(universityData);
          
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

          createdUniversities.push(University.fromDatabase(result.rows[0]));
        }
      });

      // Invalidate cache
      await this.invalidateCache();
      
      logger.info(`Bulk created ${createdUniversities.length} universities`);
      return createdUniversities;
    } catch (error) {
      logger.error('Failed to bulk create universities:', error);
      throw new DatabaseError('Failed to bulk create universities');
    }
  }

  /**
   * Get universities by type
   */
  async getByType(type: 'Devlet' | 'Vakıf'): Promise<University[]> {
    try {
      const result = await db.query(`
        SELECT id, name, city, type, aliases, created_at, updated_at
        FROM universities
        WHERE type = $1
        ORDER BY name
      `, [type]);

      return result.rows.map((row: any) => University.fromDatabase(row));
    } catch (error) {
      logger.error(`Failed to fetch universities by type ${type}:`, error);
      throw new DatabaseError(`Failed to fetch universities by type ${type}`);
    }
  }

  /**
   * Get universities by city
   */
  async getByCity(city: string): Promise<University[]> {
    try {
      const result = await db.query(`
        SELECT id, name, city, type, aliases, created_at, updated_at
        FROM universities
        WHERE LOWER(city) = LOWER($1)
        ORDER BY name
      `, [city]);

      return result.rows.map((row: any) => University.fromDatabase(row));
    } catch (error) {
      logger.error(`Failed to fetch universities by city ${city}:`, error);
      throw new DatabaseError(`Failed to fetch universities by city ${city}`);
    }
  }

  /**
   * Get university statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byType: { Devlet: number; Vakıf: number };
    byCityTop10: { city: string; count: number }[];
  }> {
    try {
      const [totalResult, typeResult, cityResult] = await Promise.all([
        db.query('SELECT COUNT(*) as total FROM universities'),
        db.query(`
          SELECT type, COUNT(*) as count 
          FROM universities 
          GROUP BY type
        `),
        db.query(`
          SELECT city, COUNT(*) as count 
          FROM universities 
          WHERE city IS NOT NULL
          GROUP BY city 
          ORDER BY count DESC 
          LIMIT 10
        `),
      ]);

      const byType = { Devlet: 0, Vakıf: 0 };
      typeResult.rows.forEach((row: any) => {
        byType[row.type as 'Devlet' | 'Vakıf'] = parseInt(row.count);
      });

      return {
        total: parseInt(totalResult.rows[0].total),
        byType,
        byCityTop10: cityResult.rows.map((row: any) => ({
          city: row.city,
          count: parseInt(row.count),
        })),
      };
    } catch (error) {
      logger.error('Failed to fetch university statistics:', error);
      throw new DatabaseError('Failed to fetch university statistics');
    }
  }

  /**
   * Invalidate cache for university data
   */
  private async invalidateCache(id?: number): Promise<void> {
    try {
      if (id) {
        await this.cacheService.delete(CacheService.keys.university(id));
      }
      
      await Promise.all([
        this.cacheService.delete(CacheService.keys.universities()),
        this.cacheService.deletePattern('university:search:*'),
      ]);
    } catch (error) {
      logger.warn('Failed to invalidate university cache:', error);
    }
  }
}
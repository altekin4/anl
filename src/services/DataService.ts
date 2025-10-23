import { IDataService, University, Department, ScoreData } from '@/types';
import { UniversityRepository } from '@/repositories/UniversityRepository';
import { DepartmentRepository } from '@/repositories/DepartmentRepository';
import { ScoreDataRepository } from '@/repositories/ScoreDataRepository';
import { CacheService } from './CacheService';
import { MatchResult } from './FuzzyMatcher';
import logger from '@/utils/logger';

export class DataService implements IDataService {
  private universityRepo: UniversityRepository;
  private departmentRepo: DepartmentRepository;
  private scoreDataRepo: ScoreDataRepository;

  constructor(cacheService: CacheService) {
    this.universityRepo = new UniversityRepository(cacheService);
    this.departmentRepo = new DepartmentRepository(cacheService);
    this.scoreDataRepo = new ScoreDataRepository(cacheService);
  }

  // University methods
  async getUniversities(): Promise<University[]> {
    logger.debug('Fetching all universities');
    return this.universityRepo.getAll();
  }

  async getUniversityById(id: number): Promise<University | null> {
    logger.debug(`Fetching university by ID: ${id}`);
    return this.universityRepo.getById(id);
  }

  async searchUniversities(query: string, limit: number = 10): Promise<MatchResult<University>[]> {
    logger.debug(`Searching universities with query: "${query}"`);
    return this.universityRepo.search(query, limit);
  }

  async findUniversityByName(name: string): Promise<University | null> {
    logger.debug(`Finding university by name: "${name}"`);
    return this.universityRepo.findByName(name);
  }

  async getUniversitiesByType(type: 'Devlet' | 'Vakıf'): Promise<University[]> {
    logger.debug(`Fetching universities by type: ${type}`);
    return this.universityRepo.getByType(type);
  }

  async getUniversitiesByCity(city: string): Promise<University[]> {
    logger.debug(`Fetching universities by city: ${city}`);
    return this.universityRepo.getByCity(city);
  }

  // Department methods
  async getDepartments(universityId?: number): Promise<Department[]> {
    logger.debug(`Fetching departments${universityId ? ` for university ${universityId}` : ''}`);
    return universityId 
      ? this.departmentRepo.getByUniversityId(universityId)
      : this.departmentRepo.getAll();
  }

  async getDepartmentById(id: number): Promise<Department | null> {
    logger.debug(`Fetching department by ID: ${id}`);
    return this.departmentRepo.getById(id);
  }

  async searchDepartments(query: string, universityId?: number, limit: number = 10): Promise<MatchResult<Department>[]> {
    logger.debug(`Searching departments with query: "${query}"${universityId ? ` in university ${universityId}` : ''}`);
    return this.departmentRepo.search(query, universityId, limit);
  }

  async findDepartmentByNameAndUniversity(name: string, universityId: number): Promise<Department | null> {
    logger.debug(`Finding department "${name}" in university ${universityId}`);
    return this.departmentRepo.findByNameAndUniversity(name, universityId);
  }

  async getDepartmentsByLanguage(language: string): Promise<Department[]> {
    logger.debug(`Fetching departments by language: ${language}`);
    return this.departmentRepo.getByLanguage(language);
  }

  async getDepartmentsByFaculty(faculty: string): Promise<Department[]> {
    logger.debug(`Fetching departments by faculty: ${faculty}`);
    return this.departmentRepo.getByFaculty(faculty);
  }

  // Score data methods
  async getScoreData(departmentId: number, year?: number): Promise<ScoreData[]> {
    logger.debug(`Fetching score data for department ${departmentId}${year ? ` for year ${year}` : ''}`);
    return this.scoreDataRepo.getByDepartmentAndYear(departmentId, year);
  }

  async getLatestScoreData(departmentId: number): Promise<ScoreData[]> {
    logger.debug(`Fetching latest score data for department ${departmentId}`);
    return this.scoreDataRepo.getLatestByDepartment(departmentId);
  }

  async getScoreDataByType(scoreType: string, year: number, limit: number = 100): Promise<ScoreData[]> {
    logger.debug(`Fetching score data by type ${scoreType} for year ${year}`);
    return this.scoreDataRepo.getByScoreTypeAndYear(scoreType, year, limit);
  }

  async getDepartmentsByScoreRange(
    scoreType: string,
    minScore: number,
    maxScore: number,
    year?: number,
    limit: number = 50
  ): Promise<ScoreData[]> {
    logger.debug(`Fetching departments by score range: ${minScore}-${maxScore} for type ${scoreType}`);
    return this.scoreDataRepo.getDepartmentsByScoreRange(scoreType, minScore, maxScore, year, limit);
  }

  async getAvailableYears(): Promise<number[]> {
    logger.debug('Fetching available years for score data');
    return this.scoreDataRepo.getAvailableYears();
  }

  // Combined search methods
  async findDepartmentByUniversityAndDepartmentName(
    universityName: string,
    departmentName: string,
    language?: string
  ): Promise<{
    university: University | null;
    department: Department | null;
    scoreData: ScoreData[];
  }> {
    logger.debug(`Finding department: "${departmentName}" at "${universityName}"${language ? ` (${language})` : ''}`);

    // Find university
    const university = await this.findUniversityByName(universityName);
    if (!university) {
      return { university: null, department: null, scoreData: [] };
    }

    // Find department
    const departmentMatches = await this.searchDepartments(departmentName, university.id, 10);
    let department: Department | null = null;

    if (departmentMatches.length > 0) {
      // If language is specified, try to find exact language match
      if (language) {
        const languageMatch = departmentMatches.find(match => 
          match.item.language.toLowerCase().includes(language.toLowerCase())
        );
        department = languageMatch ? languageMatch.item : departmentMatches[0].item;
      } else {
        department = departmentMatches[0].item;
      }
    }

    // Get score data if department found
    const scoreData = department 
      ? await this.getLatestScoreData(department.id)
      : [];

    return { university, department, scoreData };
  }

  async suggestSimilarDepartments(
    targetScore: number,
    scoreType: string,
    year?: number,
    limit: number = 10
  ): Promise<Array<{
    department: Department;
    university: University;
    scoreData: ScoreData;
    scoreDifference: number;
  }>> {
    logger.debug(`Suggesting similar departments for score ${targetScore} (${scoreType})`);

    // Get departments within ±50 points of target score
    const scoreRange = 50;
    const scoreDataList = await this.getDepartmentsByScoreRange(
      scoreType,
      Math.max(0, targetScore - scoreRange),
      Math.min(600, targetScore + scoreRange),
      year,
      limit * 2 // Get more to filter and sort
    );

    const suggestions = [];

    for (const scoreData of scoreDataList) {
      const department = await this.getDepartmentById(scoreData.departmentId);
      if (!department) continue;

      const university = await this.getUniversityById(department.universityId);
      if (!university) continue;

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
  async getSystemStatistics(): Promise<{
    universities: {
      total: number;
      byType: { Devlet: number; Vakıf: number };
      byCityTop10: { city: string; count: number }[];
    };
    departments: {
      total: number;
      byLanguage: { language: string; count: number }[];
      byFacultyTop10: { faculty: string; count: number }[];
    };
    scoreData: {
      totalRecords: number;
      byScoreType: { scoreType: string; count: number; avgBaseScore: number }[];
      byYear: { year: number; count: number }[];
    };
  }> {
    logger.debug('Fetching system statistics');

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
  async importUniversities(universities: Partial<University>[]): Promise<University[]> {
    logger.info(`Importing ${universities.length} universities`);
    return this.universityRepo.bulkCreate(universities);
  }

  async importDepartments(departments: Partial<Department>[]): Promise<Department[]> {
    logger.info(`Importing ${departments.length} departments`);
    return this.departmentRepo.bulkCreate(departments);
  }

  async importScoreData(scoreDataList: Partial<ScoreData>[]): Promise<ScoreData[]> {
    logger.info(`Importing ${scoreDataList.length} score data records`);
    return this.scoreDataRepo.bulkCreate(scoreDataList);
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      database: boolean;
      cache: boolean;
      dataAvailability: {
        universities: number;
        departments: number;
        scoreData: number;
      };
    };
  }> {
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

      const status = 
        checks.dataAvailability.universities > 0 && 
        checks.dataAvailability.departments > 0 && 
        checks.dataAvailability.scoreData > 0
          ? 'healthy'
          : checks.dataAvailability.universities > 0
          ? 'degraded'
          : 'unhealthy';

      return { status, checks };
    } catch (error) {
      logger.error('Health check failed:', error);
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
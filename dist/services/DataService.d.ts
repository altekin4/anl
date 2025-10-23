import { IDataService, University, Department, ScoreData } from '@/types';
import { CacheService } from './CacheService';
import { MatchResult } from './FuzzyMatcher';
export declare class DataService implements IDataService {
    private universityRepo;
    private departmentRepo;
    private scoreDataRepo;
    constructor(cacheService: CacheService);
    getUniversities(): Promise<University[]>;
    getUniversityById(id: number): Promise<University | null>;
    searchUniversities(query: string, limit?: number): Promise<MatchResult<University>[]>;
    findUniversityByName(name: string): Promise<University | null>;
    getUniversitiesByType(type: 'Devlet' | 'Vakıf'): Promise<University[]>;
    getUniversitiesByCity(city: string): Promise<University[]>;
    getDepartments(universityId?: number): Promise<Department[]>;
    getDepartmentById(id: number): Promise<Department | null>;
    searchDepartments(query: string, universityId?: number, limit?: number): Promise<MatchResult<Department>[]>;
    findDepartmentByNameAndUniversity(name: string, universityId: number): Promise<Department | null>;
    getDepartmentsByLanguage(language: string): Promise<Department[]>;
    getDepartmentsByFaculty(faculty: string): Promise<Department[]>;
    getScoreData(departmentId: number, year?: number): Promise<ScoreData[]>;
    getLatestScoreData(departmentId: number): Promise<ScoreData[]>;
    getScoreDataByType(scoreType: string, year: number, limit?: number): Promise<ScoreData[]>;
    getDepartmentsByScoreRange(scoreType: string, minScore: number, maxScore: number, year?: number, limit?: number): Promise<ScoreData[]>;
    getAvailableYears(): Promise<number[]>;
    findDepartmentByUniversityAndDepartmentName(universityName: string, departmentName: string, language?: string): Promise<{
        university: University | null;
        department: Department | null;
        scoreData: ScoreData[];
    }>;
    suggestSimilarDepartments(targetScore: number, scoreType: string, year?: number, limit?: number): Promise<Array<{
        department: Department;
        university: University;
        scoreData: ScoreData;
        scoreDifference: number;
    }>>;
    getSystemStatistics(): Promise<{
        universities: {
            total: number;
            byType: {
                Devlet: number;
                Vakıf: number;
            };
            byCityTop10: {
                city: string;
                count: number;
            }[];
        };
        departments: {
            total: number;
            byLanguage: {
                language: string;
                count: number;
            }[];
            byFacultyTop10: {
                faculty: string;
                count: number;
            }[];
        };
        scoreData: {
            totalRecords: number;
            byScoreType: {
                scoreType: string;
                count: number;
                avgBaseScore: number;
            }[];
            byYear: {
                year: number;
                count: number;
            }[];
        };
    }>;
    importUniversities(universities: Partial<University>[]): Promise<University[]>;
    importDepartments(departments: Partial<Department>[]): Promise<Department[]>;
    importScoreData(scoreDataList: Partial<ScoreData>[]): Promise<ScoreData[]>;
    healthCheck(): Promise<{
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
    }>;
}
//# sourceMappingURL=DataService.d.ts.map
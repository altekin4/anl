import { Department as IDepartment } from '@/types';
export declare class Department implements IDepartment {
    id: number;
    universityId: number;
    name: string;
    faculty: string;
    language: string;
    aliases: string[];
    createdAt: Date;
    updatedAt: Date;
    constructor(data: Partial<IDepartment>);
    private validate;
    addAlias(alias: string): void;
    removeAlias(alias: string): void;
    hasAlias(alias: string): boolean;
    matchesQuery(query: string): boolean;
    isEnglish(): boolean;
    isPartialEnglish(): boolean;
    getLanguageType(): 'turkish' | 'english' | 'partial_english';
    toJSON(): IDepartment;
    static fromDatabase(row: any): Department;
}
//# sourceMappingURL=Department.d.ts.map
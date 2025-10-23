import { University as IUniversity } from '@/types';
export declare class University implements IUniversity {
    id: number;
    name: string;
    city: string;
    type: 'Devlet' | 'Vakıf';
    aliases: string[];
    createdAt: Date;
    updatedAt: Date;
    constructor(data: Partial<IUniversity>);
    private validate;
    addAlias(alias: string): void;
    removeAlias(alias: string): void;
    hasAlias(alias: string): boolean;
    matchesQuery(query: string): boolean;
    toJSON(): IUniversity;
    static fromDatabase(row: any): University;
}
//# sourceMappingURL=University.d.ts.map
import { Department as IDepartment } from '@/types';
import { ValidationError } from '@/utils/errors';

export class Department implements IDepartment {
  public id: number;
  public universityId: number;
  public name: string;
  public faculty: string;
  public language: string;
  public aliases: string[];
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: Partial<IDepartment>) {
    this.id = data.id || 0;
    this.universityId = data.universityId || 0;
    this.name = data.name || '';
    this.faculty = data.faculty || '';
    this.language = data.language || 'Türkçe';
    this.aliases = data.aliases || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();

    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new ValidationError('Department name is required');
    }

    if (this.name.length > 255) {
      throw new ValidationError('Department name cannot exceed 255 characters');
    }

    if (this.universityId <= 0) {
      throw new ValidationError('Valid university ID is required');
    }

    if (this.faculty && this.faculty.length > 255) {
      throw new ValidationError('Faculty name cannot exceed 255 characters');
    }

    if (this.language && this.language.length > 100) {
      throw new ValidationError('Language cannot exceed 100 characters');
    }

    if (!Array.isArray(this.aliases)) {
      throw new ValidationError('Aliases must be an array');
    }
  }

  public addAlias(alias: string): void {
    if (!alias || alias.trim().length === 0) {
      throw new ValidationError('Alias cannot be empty');
    }

    const trimmedAlias = alias.trim();
    if (!this.aliases.includes(trimmedAlias)) {
      this.aliases.push(trimmedAlias);
    }
  }

  public removeAlias(alias: string): void {
    const index = this.aliases.indexOf(alias);
    if (index > -1) {
      this.aliases.splice(index, 1);
    }
  }

  public hasAlias(alias: string): boolean {
    return this.aliases.includes(alias.trim());
  }

  public matchesQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase().trim();
    
    // Check main name
    if (this.name.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Check faculty
    if (this.faculty && this.faculty.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Check aliases
    return this.aliases.some(alias => 
      alias.toLowerCase().includes(lowerQuery)
    );
  }

  public isEnglish(): boolean {
    return this.language.toLowerCase().includes('ingilizce') || 
           this.language.toLowerCase().includes('english');
  }

  public isPartialEnglish(): boolean {
    return this.language.includes('%30') || 
           this.language.toLowerCase().includes('partial');
  }

  public getLanguageType(): 'turkish' | 'english' | 'partial_english' {
    if (this.isPartialEnglish()) {
      return 'partial_english';
    }
    if (this.isEnglish()) {
      return 'english';
    }
    return 'turkish';
  }

  public toJSON(): IDepartment {
    return {
      id: this.id,
      universityId: this.universityId,
      name: this.name,
      faculty: this.faculty,
      language: this.language,
      aliases: [...this.aliases],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  public static fromDatabase(row: any): Department {
    return new Department({
      id: row.id,
      universityId: row.university_id,
      name: row.name,
      faculty: row.faculty,
      language: row.language,
      aliases: row.aliases || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
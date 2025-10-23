import { University as IUniversity } from '@/types';
import { ValidationError } from '@/utils/errors';

export class University implements IUniversity {
  public id: number;
  public name: string;
  public city: string;
  public type: 'Devlet' | 'Vakıf';
  public aliases: string[];
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: Partial<IUniversity>) {
    this.id = data.id || 0;
    this.name = data.name || '';
    this.city = data.city || '';
    this.type = data.type || 'Devlet';
    this.aliases = data.aliases || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();

    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new ValidationError('University name is required');
    }

    if (this.name.length > 255) {
      throw new ValidationError('University name cannot exceed 255 characters');
    }

    if (!['Devlet', 'Vakıf'].includes(this.type)) {
      throw new ValidationError('University type must be either "Devlet" or "Vakıf"');
    }

    if (this.city && this.city.length > 100) {
      throw new ValidationError('City name cannot exceed 100 characters');
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

    // Check aliases
    return this.aliases.some(alias => 
      alias.toLowerCase().includes(lowerQuery)
    );
  }

  public toJSON(): IUniversity {
    return {
      id: this.id,
      name: this.name,
      city: this.city,
      type: this.type,
      aliases: [...this.aliases],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  public static fromDatabase(row: any): University {
    return new University({
      id: row.id,
      name: row.name,
      city: row.city,
      type: row.type,
      aliases: row.aliases || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
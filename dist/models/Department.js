"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Department = void 0;
const errors_1 = require("@/utils/errors");
class Department {
    constructor(data) {
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
    validate() {
        if (!this.name || this.name.trim().length === 0) {
            throw new errors_1.ValidationError('Department name is required');
        }
        if (this.name.length > 255) {
            throw new errors_1.ValidationError('Department name cannot exceed 255 characters');
        }
        if (this.universityId <= 0) {
            throw new errors_1.ValidationError('Valid university ID is required');
        }
        if (this.faculty && this.faculty.length > 255) {
            throw new errors_1.ValidationError('Faculty name cannot exceed 255 characters');
        }
        if (this.language && this.language.length > 100) {
            throw new errors_1.ValidationError('Language cannot exceed 100 characters');
        }
        if (!Array.isArray(this.aliases)) {
            throw new errors_1.ValidationError('Aliases must be an array');
        }
    }
    addAlias(alias) {
        if (!alias || alias.trim().length === 0) {
            throw new errors_1.ValidationError('Alias cannot be empty');
        }
        const trimmedAlias = alias.trim();
        if (!this.aliases.includes(trimmedAlias)) {
            this.aliases.push(trimmedAlias);
        }
    }
    removeAlias(alias) {
        const index = this.aliases.indexOf(alias);
        if (index > -1) {
            this.aliases.splice(index, 1);
        }
    }
    hasAlias(alias) {
        return this.aliases.includes(alias.trim());
    }
    matchesQuery(query) {
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
        return this.aliases.some(alias => alias.toLowerCase().includes(lowerQuery));
    }
    isEnglish() {
        return this.language.toLowerCase().includes('ingilizce') ||
            this.language.toLowerCase().includes('english');
    }
    isPartialEnglish() {
        return this.language.includes('%30') ||
            this.language.toLowerCase().includes('partial');
    }
    getLanguageType() {
        if (this.isPartialEnglish()) {
            return 'partial_english';
        }
        if (this.isEnglish()) {
            return 'english';
        }
        return 'turkish';
    }
    toJSON() {
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
    static fromDatabase(row) {
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
exports.Department = Department;
//# sourceMappingURL=Department.js.map
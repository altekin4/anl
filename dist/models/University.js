"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.University = void 0;
const errors_1 = require("@/utils/errors");
class University {
    constructor(data) {
        this.id = data.id || 0;
        this.name = data.name || '';
        this.city = data.city || '';
        this.type = data.type || 'Devlet';
        this.aliases = data.aliases || [];
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.validate();
    }
    validate() {
        if (!this.name || this.name.trim().length === 0) {
            throw new errors_1.ValidationError('University name is required');
        }
        if (this.name.length > 255) {
            throw new errors_1.ValidationError('University name cannot exceed 255 characters');
        }
        if (!['Devlet', 'Vakıf'].includes(this.type)) {
            throw new errors_1.ValidationError('University type must be either "Devlet" or "Vakıf"');
        }
        if (this.city && this.city.length > 100) {
            throw new errors_1.ValidationError('City name cannot exceed 100 characters');
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
        // Check aliases
        return this.aliases.some(alias => alias.toLowerCase().includes(lowerQuery));
    }
    toJSON() {
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
    static fromDatabase(row) {
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
exports.University = University;
//# sourceMappingURL=University.js.map
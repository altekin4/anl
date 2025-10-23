"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreData = void 0;
const errors_1 = require("@/utils/errors");
class ScoreData {
    constructor(data) {
        this.id = data.id || 0;
        this.departmentId = data.departmentId || 0;
        this.year = data.year || new Date().getFullYear();
        this.scoreType = data.scoreType || 'TYT';
        this.baseScore = data.baseScore || 0;
        this.ceilingScore = data.ceilingScore || 0;
        this.baseRank = data.baseRank || 0;
        this.ceilingRank = data.ceilingRank || 0;
        this.quota = data.quota || 0;
        this.createdAt = data.createdAt || new Date();
        this.validate();
    }
    validate() {
        if (this.departmentId <= 0) {
            throw new errors_1.ValidationError('Valid department ID is required');
        }
        if (this.year < 2000 || this.year > new Date().getFullYear() + 1) {
            throw new errors_1.ValidationError('Year must be between 2000 and next year');
        }
        if (!['TYT', 'SAY', 'EA', 'SOZ', 'DIL'].includes(this.scoreType)) {
            throw new errors_1.ValidationError('Score type must be one of: TYT, SAY, EA, SOZ, DIL');
        }
        if (this.baseScore < 0 || this.baseScore > 600) {
            throw new errors_1.ValidationError('Base score must be between 0 and 600');
        }
        if (this.ceilingScore < 0 || this.ceilingScore > 600) {
            throw new errors_1.ValidationError('Ceiling score must be between 0 and 600');
        }
        if (this.baseScore > this.ceilingScore) {
            throw new errors_1.ValidationError('Base score cannot be higher than ceiling score');
        }
        if (this.baseRank < 0) {
            throw new errors_1.ValidationError('Base rank cannot be negative');
        }
        if (this.ceilingRank < 0) {
            throw new errors_1.ValidationError('Ceiling rank cannot be negative');
        }
        if (this.baseRank < this.ceilingRank && this.ceilingRank > 0) {
            throw new errors_1.ValidationError('Base rank should be higher than ceiling rank (lower rank number means better rank)');
        }
        if (this.quota < 0) {
            throw new errors_1.ValidationError('Quota cannot be negative');
        }
    }
    getScoreRange() {
        return {
            min: this.baseScore,
            max: this.ceilingScore,
        };
    }
    getRankRange() {
        return {
            best: this.ceilingRank,
            worst: this.baseRank,
        };
    }
    isCompetitive() {
        // Consider competitive if base score is above 400
        return this.baseScore > 400;
    }
    getCompetitivityLevel() {
        if (this.baseScore < 300)
            return 'low';
        if (this.baseScore < 400)
            return 'medium';
        if (this.baseScore < 500)
            return 'high';
        return 'very_high';
    }
    getSafeTargetScore(safetyMargin = 0.05) {
        return Math.round(this.baseScore * (1 + safetyMargin) * 100) / 100;
    }
    isCurrentYear() {
        return this.year === new Date().getFullYear();
    }
    toJSON() {
        return {
            id: this.id,
            departmentId: this.departmentId,
            year: this.year,
            scoreType: this.scoreType,
            baseScore: this.baseScore,
            ceilingScore: this.ceilingScore,
            baseRank: this.baseRank,
            ceilingRank: this.ceilingRank,
            quota: this.quota,
            createdAt: this.createdAt,
        };
    }
    static fromDatabase(row) {
        return new ScoreData({
            id: row.id,
            departmentId: row.department_id,
            year: row.year,
            scoreType: row.score_type,
            baseScore: parseFloat(row.base_score),
            ceilingScore: parseFloat(row.ceiling_score),
            baseRank: row.base_rank,
            ceilingRank: row.ceiling_rank,
            quota: row.quota,
            createdAt: new Date(row.created_at),
        });
    }
}
exports.ScoreData = ScoreData;
//# sourceMappingURL=ScoreData.js.map
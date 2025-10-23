"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSessionId = exports.validateMessageContent = exports.validateScoreTypeParam = exports.validateSearchQuery = exports.validateCalculationRequest = void 0;
const errors_1 = require("@/utils/errors");
/**
 * Validate calculation request body
 */
const validateCalculationRequest = (req, res, next) => {
    try {
        const { university, department, scoreType, language } = req.body;
        // Validate required fields
        if (!department || typeof department !== 'string' || department.trim().length === 0) {
            throw new errors_1.ValidationError('Department name is required and must be a non-empty string');
        }
        if (!scoreType || typeof scoreType !== 'string') {
            throw new errors_1.ValidationError('Score type is required and must be a string');
        }
        // Validate score type
        const validScoreTypes = ['TYT', 'SAY', 'EA', 'SOZ', 'DIL'];
        if (!validScoreTypes.includes(scoreType)) {
            throw new errors_1.ValidationError(`Invalid score type. Must be one of: ${validScoreTypes.join(', ')}`);
        }
        // Validate optional fields
        if (university !== undefined) {
            if (typeof university !== 'string' || university.trim().length === 0) {
                throw new errors_1.ValidationError('University name must be a non-empty string if provided');
            }
        }
        if (language !== undefined) {
            if (typeof language !== 'string') {
                throw new errors_1.ValidationError('Language must be a string if provided');
            }
        }
        // Validate safety margins if provided (for scenarios endpoint)
        if (req.body.safetyMargins !== undefined) {
            const { safetyMargins } = req.body;
            if (!Array.isArray(safetyMargins)) {
                throw new errors_1.ValidationError('Safety margins must be an array');
            }
            for (const margin of safetyMargins) {
                if (typeof margin !== 'number' || margin < 0 || margin > 1) {
                    throw new errors_1.ValidationError('Safety margins must be numbers between 0 and 1');
                }
            }
            if (safetyMargins.length === 0) {
                throw new errors_1.ValidationError('At least one safety margin must be provided');
            }
            if (safetyMargins.length > 10) {
                throw new errors_1.ValidationError('Maximum 10 safety margins allowed');
            }
        }
        // Sanitize input
        req.body.department = department.trim();
        if (university) {
            req.body.university = university.trim();
        }
        if (language) {
            req.body.language = language.trim();
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validateCalculationRequest = validateCalculationRequest;
/**
 * Validate query parameters for search endpoints
 */
const validateSearchQuery = (req, res, next) => {
    try {
        const { query, limit, offset } = req.query;
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new errors_1.ValidationError('Search query is required and must be a non-empty string');
        }
        if (query.length > 100) {
            throw new errors_1.ValidationError('Search query cannot exceed 100 characters');
        }
        // Validate pagination parameters
        if (limit !== undefined) {
            const limitNum = parseInt(limit, 10);
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                throw new errors_1.ValidationError('Limit must be a number between 1 and 100');
            }
            req.query.limit = limitNum.toString();
        }
        if (offset !== undefined) {
            const offsetNum = parseInt(offset, 10);
            if (isNaN(offsetNum) || offsetNum < 0) {
                throw new errors_1.ValidationError('Offset must be a non-negative number');
            }
            req.query.offset = offsetNum.toString();
        }
        // Sanitize query
        req.query.query = query.trim();
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validateSearchQuery = validateSearchQuery;
/**
 * Validate score type parameter
 */
const validateScoreTypeParam = (req, res, next) => {
    try {
        const { scoreType } = req.params;
        if (!scoreType || typeof scoreType !== 'string') {
            throw new errors_1.ValidationError('Score type parameter is required');
        }
        const validScoreTypes = ['TYT', 'SAY', 'EA', 'SOZ', 'DIL'];
        if (!validScoreTypes.includes(scoreType.toUpperCase())) {
            throw new errors_1.ValidationError(`Invalid score type. Must be one of: ${validScoreTypes.join(', ')}`);
        }
        // Normalize to uppercase
        req.params.scoreType = scoreType.toUpperCase();
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validateScoreTypeParam = validateScoreTypeParam;
/**
 * Validate chat message content
 */
const validateMessageContent = (req, res, next) => {
    try {
        const { content } = req.body;
        if (!content || typeof content !== 'string') {
            throw new errors_1.ValidationError('Message content is required and must be a string');
        }
        if (content.trim().length === 0) {
            throw new errors_1.ValidationError('Message content cannot be empty');
        }
        if (content.length > 1000) {
            throw new errors_1.ValidationError('Message content cannot exceed 1000 characters');
        }
        // Check for potentially harmful content (basic sanitization)
        const suspiciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
        ];
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(content)) {
                throw new errors_1.ValidationError('Message content contains potentially harmful code');
            }
        }
        // Sanitize content
        req.body.content = content.trim();
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validateMessageContent = validateMessageContent;
/**
 * Validate session ID parameter
 */
const validateSessionId = (req, res, next) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId || typeof sessionId !== 'string') {
            throw new errors_1.ValidationError('Session ID parameter is required');
        }
        // Basic UUID validation (assuming UUIDs are used for session IDs)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(sessionId)) {
            throw new errors_1.ValidationError('Invalid session ID format');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validateSessionId = validateSessionId;
//# sourceMappingURL=validation.js.map
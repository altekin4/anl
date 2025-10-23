"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessLogicError = exports.RateLimitError = exports.CacheError = exports.DatabaseError = exports.ExternalServiceError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = void 0;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ExternalServiceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ExternalServiceError';
    }
}
exports.ExternalServiceError = ExternalServiceError;
class DatabaseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
class CacheError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CacheError';
    }
}
exports.CacheError = CacheError;
class RateLimitError extends Error {
    constructor(message, statusCode = 429, code = 'RATE_LIMIT_EXCEEDED') {
        super(message);
        this.name = 'RateLimitError';
        this.statusCode = statusCode;
        this.code = code;
    }
}
exports.RateLimitError = RateLimitError;
class BusinessLogicError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BusinessLogicError';
    }
}
exports.BusinessLogicError = BusinessLogicError;
//# sourceMappingURL=errors.js.map
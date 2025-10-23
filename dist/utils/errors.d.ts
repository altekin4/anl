export declare class ValidationError extends Error {
    constructor(message: string);
}
export declare class NotFoundError extends Error {
    constructor(message: string);
}
export declare class UnauthorizedError extends Error {
    constructor(message: string);
}
export declare class ExternalServiceError extends Error {
    constructor(message: string);
}
export declare class DatabaseError extends Error {
    constructor(message: string);
}
export declare class CacheError extends Error {
    constructor(message: string);
}
export declare class RateLimitError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class BusinessLogicError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map
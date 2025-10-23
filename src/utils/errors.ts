export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ExternalServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class CacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CacheError';
  }
}

export class RateLimitError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 429, code: string = 'RATE_LIMIT_EXCEEDED') {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class BusinessLogicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}
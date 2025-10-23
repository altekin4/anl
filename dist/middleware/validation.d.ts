import { Request, Response, NextFunction } from 'express';
/**
 * Validate calculation request body
 */
export declare const validateCalculationRequest: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validate query parameters for search endpoints
 */
export declare const validateSearchQuery: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validate score type parameter
 */
export declare const validateScoreTypeParam: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validate chat message content
 */
export declare const validateMessageContent: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validate session ID parameter
 */
export declare const validateSessionId: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map
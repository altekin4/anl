import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    isOperational: boolean;
    details?: any;
    constructor(message: string, statusCode?: number, code?: string, details?: any);
}
export declare const errorHandler: (error: Error | AppError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const handleUnhandledRejection: () => void;
export declare const handleUncaughtException: () => void;
export default errorHandler;
//# sourceMappingURL=errorHandler.d.ts.map
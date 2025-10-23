import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@/utils/errors';

/**
 * Validate calculation request body
 */
export const validateCalculationRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { university, department, scoreType, language } = req.body;

    // Validate required fields
    if (!department || typeof department !== 'string' || department.trim().length === 0) {
      throw new ValidationError('Department name is required and must be a non-empty string');
    }

    if (!scoreType || typeof scoreType !== 'string') {
      throw new ValidationError('Score type is required and must be a string');
    }

    // Validate score type
    const validScoreTypes = ['TYT', 'SAY', 'EA', 'SOZ', 'DIL'];
    if (!validScoreTypes.includes(scoreType)) {
      throw new ValidationError(
        `Invalid score type. Must be one of: ${validScoreTypes.join(', ')}`
      );
    }

    // Validate optional fields
    if (university !== undefined) {
      if (typeof university !== 'string' || university.trim().length === 0) {
        throw new ValidationError('University name must be a non-empty string if provided');
      }
    }

    if (language !== undefined) {
      if (typeof language !== 'string') {
        throw new ValidationError('Language must be a string if provided');
      }
    }

    // Validate safety margins if provided (for scenarios endpoint)
    if (req.body.safetyMargins !== undefined) {
      const { safetyMargins } = req.body;
      
      if (!Array.isArray(safetyMargins)) {
        throw new ValidationError('Safety margins must be an array');
      }

      for (const margin of safetyMargins) {
        if (typeof margin !== 'number' || margin < 0 || margin > 1) {
          throw new ValidationError('Safety margins must be numbers between 0 and 1');
        }
      }

      if (safetyMargins.length === 0) {
        throw new ValidationError('At least one safety margin must be provided');
      }

      if (safetyMargins.length > 10) {
        throw new ValidationError('Maximum 10 safety margins allowed');
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
  } catch (error) {
    next(error);
  }
};

/**
 * Validate query parameters for search endpoints
 */
export const validateSearchQuery = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { query, limit, offset } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new ValidationError('Search query is required and must be a non-empty string');
    }

    if (query.length > 100) {
      throw new ValidationError('Search query cannot exceed 100 characters');
    }

    // Validate pagination parameters
    if (limit !== undefined) {
      const limitNum = parseInt(limit as string, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new ValidationError('Limit must be a number between 1 and 100');
      }
      req.query.limit = limitNum.toString();
    }

    if (offset !== undefined) {
      const offsetNum = parseInt(offset as string, 10);
      if (isNaN(offsetNum) || offsetNum < 0) {
        throw new ValidationError('Offset must be a non-negative number');
      }
      req.query.offset = offsetNum.toString();
    }

    // Sanitize query
    req.query.query = (query as string).trim();

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate score type parameter
 */
export const validateScoreTypeParam = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { scoreType } = req.params;

    if (!scoreType || typeof scoreType !== 'string') {
      throw new ValidationError('Score type parameter is required');
    }

    const validScoreTypes = ['TYT', 'SAY', 'EA', 'SOZ', 'DIL'];
    if (!validScoreTypes.includes(scoreType.toUpperCase())) {
      throw new ValidationError(
        `Invalid score type. Must be one of: ${validScoreTypes.join(', ')}`
      );
    }

    // Normalize to uppercase
    req.params.scoreType = scoreType.toUpperCase();

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate chat message content
 */
export const validateMessageContent = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      throw new ValidationError('Message content is required and must be a string');
    }

    if (content.trim().length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }

    if (content.length > 1000) {
      throw new ValidationError('Message content cannot exceed 1000 characters');
    }

    // Check for potentially harmful content (basic sanitization)
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        throw new ValidationError('Message content contains potentially harmful code');
      }
    }

    // Sanitize content
    req.body.content = content.trim();

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate session ID parameter
 */
export const validateSessionId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || typeof sessionId !== 'string') {
      throw new ValidationError('Session ID parameter is required');
    }

    // Basic UUID validation (assuming UUIDs are used for session IDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      throw new ValidationError('Invalid session ID format');
    }

    next();
  } catch (error) {
    next(error);
  }
};
import Joi from 'joi';

// Chat message validation
export const chatMessageSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required(),
  sessionId: Joi.string().uuid().required(),
});

// User registration validation
export const userRegistrationSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('student', 'teacher', 'parent').default('student'),
});

// University search validation
export const universitySearchSchema = Joi.object({
  query: Joi.string().min(2).max(100).required(),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

// Department search validation
export const departmentSearchSchema = Joi.object({
  query: Joi.string().min(2).max(100).required(),
  universityId: Joi.number().integer().positive().optional(),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

// Net calculation validation
export const netCalculationSchema = Joi.object({
  university: Joi.string().min(2).max(100).required(),
  department: Joi.string().min(2).max(100).required(),
  language: Joi.string().valid('Türkçe', 'İngilizce', '%30 İngilizce').optional(),
  scoreType: Joi.string().valid('TYT', 'SAY', 'EA', 'SOZ', 'DIL').required(),
});

// Validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details,
        },
      });
    }
    next();
  };
};
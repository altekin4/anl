"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.netCalculationSchema = exports.departmentSearchSchema = exports.universitySearchSchema = exports.userRegistrationSchema = exports.chatMessageSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// Chat message validation
exports.chatMessageSchema = joi_1.default.object({
    content: joi_1.default.string().min(1).max(1000).required(),
    sessionId: joi_1.default.string().uuid().required(),
});
// User registration validation
exports.userRegistrationSchema = joi_1.default.object({
    username: joi_1.default.string().alphanum().min(3).max(30).required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    role: joi_1.default.string().valid('student', 'teacher', 'parent').default('student'),
});
// University search validation
exports.universitySearchSchema = joi_1.default.object({
    query: joi_1.default.string().min(2).max(100).required(),
    limit: joi_1.default.number().integer().min(1).max(50).default(10),
});
// Department search validation
exports.departmentSearchSchema = joi_1.default.object({
    query: joi_1.default.string().min(2).max(100).required(),
    universityId: joi_1.default.number().integer().positive().optional(),
    limit: joi_1.default.number().integer().min(1).max(50).default(10),
});
// Net calculation validation
exports.netCalculationSchema = joi_1.default.object({
    university: joi_1.default.string().min(2).max(100).required(),
    department: joi_1.default.string().min(2).max(100).required(),
    language: joi_1.default.string().valid('Türkçe', 'İngilizce', '%30 İngilizce').optional(),
    scoreType: joi_1.default.string().valid('TYT', 'SAY', 'EA', 'SOZ', 'DIL').required(),
});
// Validation middleware
const validate = (schema) => {
    return (req, res, next) => {
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
exports.validate = validate;
//# sourceMappingURL=validation.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUncaughtException = exports.handleUnhandledRejection = exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
const logger_1 = __importDefault(require("@/utils/logger"));
// Custom error class for application errors
class AppError extends Error {
    constructor(message, statusCode = 500, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code || 'INTERNAL_SERVER_ERROR';
        this.isOperational = true;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Turkish error messages for user-friendly responses
const turkishErrorMessages = {
    // Authentication errors
    'UNAUTHORIZED': 'Bu işlem için giriş yapmanız gerekiyor.',
    'FORBIDDEN': 'Bu işlemi gerçekleştirme yetkiniz bulunmuyor.',
    'TOKEN_EXPIRED': 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
    'INVALID_TOKEN': 'Geçersiz oturum bilgisi. Lütfen tekrar giriş yapın.',
    // Validation errors
    'VALIDATION_ERROR': 'Girdiğiniz bilgilerde hata var. Lütfen kontrol edin.',
    'MISSING_REQUIRED_FIELD': 'Zorunlu alanlar eksik. Lütfen tüm alanları doldurun.',
    'INVALID_INPUT': 'Geçersiz veri girişi. Lütfen doğru format kullanın.',
    // Data errors
    'UNIVERSITY_NOT_FOUND': 'Belirtilen üniversite bulunamadı. Lütfen üniversite adını kontrol edin.',
    'DEPARTMENT_NOT_FOUND': 'Belirtilen bölüm bulunamadı. Lütfen bölüm adını kontrol edin.',
    'SCORE_DATA_NOT_FOUND': 'Bu bölüm için puan bilgisi bulunamadı.',
    'NO_DATA_AVAILABLE': 'İstenen bilgi şu anda mevcut değil.',
    // Rate limiting
    'RATE_LIMIT_EXCEEDED': 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.',
    'TOO_MANY_MESSAGES': 'Dakikada en fazla 20 mesaj gönderebilirsiniz. Lütfen biraz bekleyin.',
    // System errors
    'DATABASE_ERROR': 'Veritabanı bağlantısında sorun oluştu. Lütfen daha sonra tekrar deneyin.',
    'CACHE_ERROR': 'Önbellek sisteminde sorun oluştu. İşleminiz devam ediyor.',
    'EXTERNAL_API_ERROR': 'Dış servis bağlantısında sorun oluştu. Lütfen daha sonra tekrar deneyin.',
    'OPENAI_API_ERROR': 'Yapay zeka servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    // Chat specific errors
    'SESSION_NOT_FOUND': 'Sohbet oturumu bulunamadı. Yeni bir sohbet başlatın.',
    'MESSAGE_TOO_LONG': 'Mesajınız çok uzun. Lütfen daha kısa bir mesaj gönderin.',
    'INVALID_MESSAGE_TYPE': 'Geçersiz mesaj türü.',
    // Calculation errors
    'INVALID_SCORE_RANGE': 'Geçersiz puan aralığı. Lütfen doğru puan değerleri girin.',
    'CALCULATION_ERROR': 'Puan hesaplamasında hata oluştu. Lütfen tekrar deneyin.',
    'INSUFFICIENT_DATA': 'Hesaplama için yeterli veri bulunmuyor.',
    // Generic errors
    'INTERNAL_SERVER_ERROR': 'Sistem hatası oluştu. Lütfen daha sonra tekrar deneyin.',
    'SERVICE_UNAVAILABLE': 'Servis şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    'TIMEOUT_ERROR': 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.',
    'NETWORK_ERROR': 'Ağ bağlantısında sorun oluştu. Lütfen internet bağlantınızı kontrol edin.',
};
// Fallback responses for different error types
const fallbackResponses = {
    'UNIVERSITY_NOT_FOUND': {
        suggestions: [
            'Üniversite adını tam olarak yazın (örn: "Marmara Üniversitesi")',
            'Kısaltma kullanmayı deneyin (örn: "M.Ü.")',
            'Benzer üniversite isimlerini kontrol edin'
        ]
    },
    'DEPARTMENT_NOT_FOUND': {
        suggestions: [
            'Bölüm adını tam olarak yazın',
            'Farklı yazım şekillerini deneyin',
            'Fakülte adıyla birlikte belirtin'
        ]
    },
    'SCORE_DATA_NOT_FOUND': {
        suggestions: [
            'Farklı bir yıl için sorgulayın',
            'Benzer bölümleri kontrol edin',
            'Genel bilgi için yardım alın'
        ]
    },
    'RATE_LIMIT_EXCEEDED': {
        retryAfter: 60, // seconds
        suggestions: [
            '1 dakika bekleyip tekrar deneyin',
            'Daha az sıklıkla mesaj gönderin'
        ]
    }
};
// Error handler middleware
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Sistem hatası oluştu. Lütfen daha sonra tekrar deneyin.';
    let details = undefined;
    let fallbackData = undefined;
    // Handle custom AppError
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        code = error.code;
        message = turkishErrorMessages[error.code] || error.message;
        details = error.details;
        fallbackData = fallbackResponses[error.code];
    }
    // Handle validation errors (Joi)
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = turkishErrorMessages['VALIDATION_ERROR'];
        details = error.details?.map((detail) => ({
            field: detail.path?.join('.'),
            message: detail.message
        }));
    }
    // Handle JWT errors
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'INVALID_TOKEN';
        message = turkishErrorMessages['INVALID_TOKEN'];
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'TOKEN_EXPIRED';
        message = turkishErrorMessages['TOKEN_EXPIRED'];
    }
    // Handle database errors
    else if (error.message.includes('connect ECONNREFUSED') || error.message.includes('database')) {
        statusCode = 503;
        code = 'DATABASE_ERROR';
        message = turkishErrorMessages['DATABASE_ERROR'];
    }
    // Handle timeout errors
    else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        statusCode = 504;
        code = 'TIMEOUT_ERROR';
        message = turkishErrorMessages['TIMEOUT_ERROR'];
    }
    // Handle rate limiting errors
    else if (error.message.includes('Too Many Requests')) {
        statusCode = 429;
        code = 'RATE_LIMIT_EXCEEDED';
        message = turkishErrorMessages['RATE_LIMIT_EXCEEDED'];
        fallbackData = fallbackResponses['RATE_LIMIT_EXCEEDED'];
    }
    // Log error details
    logger_1.default.error('Error occurred:', {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code,
            statusCode
        },
        request: {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id
        }
    });
    // Send error response
    const errorResponse = {
        success: false,
        error: {
            code,
            message,
            ...(details && { details }),
            ...(process.env.NODE_ENV === 'development' && {
                originalMessage: error.message,
                stack: error.stack
            })
        }
    };
    if (fallbackData) {
        errorResponse.fallbackData = fallbackData;
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Not found handler
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Endpoint bulunamadı: ${req.originalUrl}`, 404, 'NOT_FOUND');
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// Unhandled promise rejection handler
const handleUnhandledRejection = () => {
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.default.error('Unhandled Promise Rejection:', {
            reason: reason?.message || reason,
            stack: reason?.stack,
            promise: promise.toString()
        });
        // Graceful shutdown
        process.exit(1);
    });
};
exports.handleUnhandledRejection = handleUnhandledRejection;
// Uncaught exception handler
const handleUncaughtException = () => {
    process.on('uncaughtException', (error) => {
        logger_1.default.error('Uncaught Exception:', {
            error: error.message,
            stack: error.stack
        });
        // Graceful shutdown
        process.exit(1);
    });
};
exports.handleUncaughtException = handleUncaughtException;
exports.default = exports.errorHandler;
//# sourceMappingURL=errorHandler.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChatFallbackResponse = exports.handleChatErrors = exports.ChatError = void 0;
const errorHandler_1 = require("@/middleware/errorHandler");
const logger_1 = __importDefault(require("@/utils/logger"));
class ChatError extends errorHandler_1.AppError {
    constructor(message, code, statusCode = 400, details) {
        super(message, statusCode, code, details);
    }
}
exports.ChatError = ChatError;
// Chat-specific error handlers
exports.handleChatErrors = {
    sessionNotFound: (sessionId) => {
        logger_1.default.warn('Chat session not found', { sessionId });
        return new ChatError('Sohbet oturumu bulunamadı', 'SESSION_NOT_FOUND', 404, { sessionId });
    },
    messageTooLong: (messageLength, maxLength = 1000) => {
        logger_1.default.warn('Message too long', { messageLength, maxLength });
        return new ChatError('Mesajınız çok uzun', 'MESSAGE_TOO_LONG', 400, { messageLength, maxLength });
    },
    rateLimitExceeded: (userId, limit) => {
        logger_1.default.warn('Rate limit exceeded for user', { userId, limit });
        return new ChatError('Çok fazla mesaj gönderdiniz', 'TOO_MANY_MESSAGES', 429, { userId, limit });
    },
    invalidMessageType: (messageType) => {
        logger_1.default.warn('Invalid message type', { messageType });
        return new ChatError('Geçersiz mesaj türü', 'INVALID_MESSAGE_TYPE', 400, { messageType });
    },
    nlpProcessingFailed: (error, userMessage) => {
        logger_1.default.error('NLP processing failed', {
            error: error.message,
            userMessage: userMessage.substring(0, 100)
        });
        return new ChatError('Mesajınız işlenirken hata oluştu', 'NLP_PROCESSING_ERROR', 500, { originalError: error.message });
    },
    openaiApiError: (error) => {
        logger_1.default.error('OpenAI API error', { error: error.message || error });
        // Handle specific OpenAI errors
        if (error.code === 'rate_limit_exceeded') {
            return new ChatError('Yapay zeka servisi yoğun. Lütfen biraz bekleyin', 'OPENAI_RATE_LIMIT', 429);
        }
        if (error.code === 'insufficient_quota') {
            return new ChatError('Yapay zeka servisi kotası doldu', 'OPENAI_QUOTA_EXCEEDED', 503);
        }
        return new ChatError('Yapay zeka servisi şu anda kullanılamıyor', 'OPENAI_API_ERROR', 503, { originalError: error.message });
    },
    contextProcessingError: (error, sessionId) => {
        logger_1.default.error('Context processing error', {
            error: error.message,
            sessionId
        });
        return new ChatError('Sohbet geçmişi işlenirken hata oluştu', 'CONTEXT_PROCESSING_ERROR', 500, { sessionId, originalError: error.message });
    }
};
// Fallback response generator for chat errors
const generateChatFallbackResponse = (error) => {
    const fallbackResponses = {
        'SESSION_NOT_FOUND': {
            message: 'Yeni bir sohbet başlatalım! Size nasıl yardımcı olabilirim?',
            action: 'create_new_session',
            suggestions: [
                'Üniversite tercihi hakkında soru sorun',
                'Puan hesaplama yardımı alın',
                'Bölüm bilgilerini öğrenin'
            ]
        },
        'MESSAGE_TOO_LONG': {
            message: 'Mesajınızı daha kısa tutabilir misiniz? Böylece size daha iyi yardımcı olabilirim.',
            suggestions: [
                'Ana sorunuzu özetleyin',
                'Tek seferde bir soru sorun',
                'Detayları sonraki mesajlarda paylaşın'
            ]
        },
        'TOO_MANY_MESSAGES': {
            message: 'Biraz yavaşlayalım! Dakikada en fazla 20 mesaj gönderebilirsiniz.',
            retryAfter: 60,
            suggestions: [
                '1 dakika bekleyin',
                'Sorularınızı birleştirin',
                'Daha detaylı sorular sorun'
            ]
        },
        'NLP_PROCESSING_ERROR': {
            message: 'Mesajınızı anlayamadım. Farklı bir şekilde ifade edebilir misiniz?',
            suggestions: [
                'Daha basit kelimeler kullanın',
                'Sorunuzu yeniden yazın',
                'Örnek: "Marmara Üniversitesi İşletme bölümü için kaç net gerekir?"'
            ]
        },
        'OPENAI_API_ERROR': {
            message: 'Yapay zeka sistemimizde geçici bir sorun var. Temel sorularınızı yanıtlamaya çalışabilirim.',
            fallbackMode: true,
            suggestions: [
                'Basit puan hesaplama soruları sorun',
                'Üniversite/bölüm bilgisi isteyin',
                'Birkaç dakika sonra tekrar deneyin'
            ]
        }
    };
    return fallbackResponses[error.code] || {
        message: 'Bir sorun oluştu ama size yardımcı olmaya devam edebilirim.',
        suggestions: [
            'Sorunuzu yeniden sorun',
            'Farklı bir konu hakkında soru sorun',
            'Yardım için "yardım" yazın'
        ]
    };
};
exports.generateChatFallbackResponse = generateChatFallbackResponse;
exports.default = exports.handleChatErrors;
//# sourceMappingURL=chatErrorHandler.js.map
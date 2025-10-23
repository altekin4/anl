import { AppError } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

export class ChatError extends AppError {
  constructor(message: string, code: string, statusCode: number = 400, details?: any) {
    super(message, statusCode, code, details);
  }
}

// Chat-specific error handlers
export const handleChatErrors = {
  sessionNotFound: (sessionId: string) => {
    logger.warn('Chat session not found', { sessionId });
    return new ChatError(
      'Sohbet oturumu bulunamadı',
      'SESSION_NOT_FOUND',
      404,
      { sessionId }
    );
  },

  messageTooLong: (messageLength: number, maxLength: number = 1000) => {
    logger.warn('Message too long', { messageLength, maxLength });
    return new ChatError(
      'Mesajınız çok uzun',
      'MESSAGE_TOO_LONG',
      400,
      { messageLength, maxLength }
    );
  },

  rateLimitExceeded: (userId: string, limit: number) => {
    logger.warn('Rate limit exceeded for user', { userId, limit });
    return new ChatError(
      'Çok fazla mesaj gönderdiniz',
      'TOO_MANY_MESSAGES',
      429,
      { userId, limit }
    );
  },

  invalidMessageType: (messageType: string) => {
    logger.warn('Invalid message type', { messageType });
    return new ChatError(
      'Geçersiz mesaj türü',
      'INVALID_MESSAGE_TYPE',
      400,
      { messageType }
    );
  },

  nlpProcessingFailed: (error: Error, userMessage: string) => {
    logger.error('NLP processing failed', { 
      error: error.message, 
      userMessage: userMessage.substring(0, 100) 
    });
    return new ChatError(
      'Mesajınız işlenirken hata oluştu',
      'NLP_PROCESSING_ERROR',
      500,
      { originalError: error.message }
    );
  },

  openaiApiError: (error: any) => {
    logger.error('OpenAI API error', { error: error.message || error });
    
    // Handle specific OpenAI errors
    if (error.code === 'rate_limit_exceeded') {
      return new ChatError(
        'Yapay zeka servisi yoğun. Lütfen biraz bekleyin',
        'OPENAI_RATE_LIMIT',
        429
      );
    }
    
    if (error.code === 'insufficient_quota') {
      return new ChatError(
        'Yapay zeka servisi kotası doldu',
        'OPENAI_QUOTA_EXCEEDED',
        503
      );
    }

    return new ChatError(
      'Yapay zeka servisi şu anda kullanılamıyor',
      'OPENAI_API_ERROR',
      503,
      { originalError: error.message }
    );
  },

  contextProcessingError: (error: Error, sessionId: string) => {
    logger.error('Context processing error', { 
      error: error.message, 
      sessionId 
    });
    return new ChatError(
      'Sohbet geçmişi işlenirken hata oluştu',
      'CONTEXT_PROCESSING_ERROR',
      500,
      { sessionId, originalError: error.message }
    );
  }
};

// Fallback response generator for chat errors
export const generateChatFallbackResponse = (error: ChatError): any => {
  const fallbackResponses: Record<string, any> = {
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

export default handleChatErrors;
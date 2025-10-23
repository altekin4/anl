"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLPService = void 0;
const IntentClassifier_1 = require("./IntentClassifier");
const EntityExtractor_1 = require("./EntityExtractor");
const ConversationContextManager_1 = require("./ConversationContextManager");
const FollowUpHandler_1 = require("./FollowUpHandler");
const logger_1 = __importDefault(require("@/utils/logger"));
class NLPService {
    constructor() {
        this.intentClassifier = new IntentClassifier_1.IntentClassifier();
        this.entityExtractor = new EntityExtractor_1.EntityExtractor();
        this.contextManager = new ConversationContextManager_1.ConversationContextManager();
        this.followUpHandler = new FollowUpHandler_1.FollowUpHandler(this.contextManager);
    }
    async processMessage(request) {
        try {
            logger_1.default.info('Processing NLP request', {
                text: request.text.substring(0, 100),
                userId: request.userId
            });
            // Classify intent
            const intent = await this.intentClassifier.classifyIntent(request.text);
            // Extract entities
            const entities = await this.entityExtractor.extractEntities(request.text, intent.keywords);
            // Update context if session exists
            if (request.sessionId) {
                this.contextManager.updateContext(request.sessionId, {
                    userMessage: request.text,
                    intent: intent.intent,
                    entities,
                    timestamp: new Date()
                });
            }
            // Generate response
            const message = this.generateResponse(intent.intent, entities);
            // Generate suggestions
            const suggestions = this.generateSuggestions(intent.intent, entities);
            const response = {
                intent: intent.intent,
                entities,
                confidence: 0.8, // Default confidence
                message,
                suggestions
            };
            logger_1.default.info('NLP processing completed', { intent, entitiesCount: Object.keys(entities).length });
            return response;
        }
        catch (error) {
            logger_1.default.error('NLP processing failed:', error);
            return {
                intent: 'error',
                entities: {},
                confidence: 0,
                message: 'Üzgünüm, mesajınızı anlayamadım. Lütfen farklı bir şekilde ifade edebilir misiniz?',
                suggestions: [
                    'Üniversite adını tam olarak yazın',
                    'Bölüm adını belirtin',
                    'Net sayılarınızı paylaşın'
                ]
            };
        }
    }
    generateResponse(intent, entities) {
        switch (intent) {
            case 'net_calculation':
                return this.generateNetCalculationResponse(entities);
            case 'base_score':
                return this.generateBaseScoreResponse(entities);
            case 'quota_inquiry':
                return this.generateQuotaResponse(entities);
            case 'department_search':
                return this.generateDepartmentSearchResponse(entities);
            case 'help':
                return this.generateHelpResponse();
            default:
                return 'Size nasıl yardımcı olabilirim? Üniversite tercihleri, net hesaplama veya bölüm bilgileri hakkında sorularınızı yanıtlayabilirim.';
        }
    }
    generateNetCalculationResponse(entities) {
        const university = entities.university || 'belirtilen üniversite';
        const department = entities.department || 'belirtilen bölüm';
        if (!entities.university || !entities.department) {
            return `Net hesaplama için üniversite ve bölüm bilgisi gerekiyor. Örneğin: "${university} ${department} için kaç net gerekir?" şeklinde sorabilirsiniz.`;
        }
        return `${university} ${department} bölümü için net hesaplama yapıyorum. Bu bölüm için genellikle TYT'de 80+ ve AYT'de 60+ net gerekir. Daha kesin bilgi için hedef puanınızı belirtebilirsiniz.`;
    }
    generateBaseScoreResponse(entities) {
        const university = entities.university || 'belirtilen üniversite';
        const department = entities.department || 'belirtilen bölüm';
        return `${university} ${department} bölümünün 2024 yılı taban puanı yaklaşık 400-450 arasındadır. Güncel ve kesin bilgi için YÖK Atlas'ı kontrol etmenizi öneririm.`;
    }
    generateQuotaResponse(entities) {
        const university = entities.university || 'belirtilen üniversite';
        const department = entities.department || 'belirtilen bölüm';
        return `${university} ${department} bölümünün kontenjan bilgisi için YÖK Atlas'tan güncel verileri kontrol edebilirim. Genellikle bu tür bölümlerin kontenjanı 100-200 arasında değişir.`;
    }
    generateDepartmentSearchResponse(entities) {
        const university = entities.university || 'belirtilen üniversite';
        return `${university} üniversitesindeki bölümler hakkında bilgi verebilirim. Hangi alan ile ilgileniyorsunuz? Mühendislik, tıp, sosyal bilimler gibi...`;
    }
    generateHelpResponse() {
        return `Size şu konularda yardımcı olabilirim:

🎯 Net hesaplama ve puan tahmini
🏫 Üniversite ve bölüm bilgileri  
📊 Taban puanları ve kontenjanlar
💡 Tercih stratejileri

Örnek sorular:
• "İTÜ Bilgisayar Mühendisliği için kaç net gerekir?"
• "Matematik 25, Fen 20 net ile hangi bölümleri tercih edebilirim?"
• "Ankara'daki tıp fakültelerinin taban puanları nedir?"

Nasıl yardımcı olabilirim?`;
    }
    generateSuggestions(intent, entities) {
        const suggestions = [];
        switch (intent) {
            case 'net_calculation':
                suggestions.push('Hedef puanınızı belirtin', 'Hangi sınav türü? (SAY, EA, SÖZ)', 'Geçmiş yıl verilerini göster');
                break;
            case 'base_score':
                suggestions.push('Kontenjan bilgisi', 'Benzer bölümler', 'Geçmiş yıl karşılaştırması');
                break;
            default:
                suggestions.push('Net hesaplama yap', 'Bölüm öner', 'Yardım al');
        }
        return suggestions;
    }
    // Context management methods
    updateBotResponse(sessionId, botResponse) {
        this.contextManager.updateLatestResponse(sessionId, botResponse);
    }
    getConversationSummary(sessionId) {
        return this.contextManager.getContextSummary(sessionId);
    }
    clearConversationContext(sessionId) {
        this.contextManager.clearContext(sessionId);
    }
    cleanupExpiredContexts() {
        this.contextManager.cleanupExpiredContexts();
    }
    getContextStats() {
        return this.contextManager.getStats();
    }
}
exports.NLPService = NLPService;
exports.default = NLPService;
//# sourceMappingURL=NLPService.js.map
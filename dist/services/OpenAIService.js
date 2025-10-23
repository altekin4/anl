"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class OpenAIService {
    constructor(config) {
        this.baseUrl = 'https://api.openai.com/v1';
        this.config = config;
    }
    /**
     * Main method to generate AI response with intent classification and entity extraction
     */
    async generateResponse(userMessage, sessionId) {
        try {
            // 1. Classify intent and extract entities
            const intent = this.classifyIntent(userMessage);
            const entities = this.extractEntities(userMessage);
            logger_1.default.info(`AI Processing: intent="${intent}", entities=${JSON.stringify(entities)}`);
            // 2. Handle specific intents
            let content;
            let suggestions = [];
            switch (intent) {
                case 'tyt_calculation':
                    const tytResult = await this.handleTYTCalculation(userMessage, entities);
                    content = tytResult.content;
                    suggestions = tytResult.suggestions;
                    break;
                case 'ayt_calculation':
                    const aytResult = await this.handleAYTCalculation(userMessage, entities);
                    content = aytResult.content;
                    suggestions = aytResult.suggestions;
                    break;
                case 'study_advice':
                    const adviceResult = await this.handleStudyAdvice(userMessage, entities);
                    content = adviceResult.content;
                    suggestions = adviceResult.suggestions;
                    break;
                case 'greeting':
                    content = this.handleGreeting();
                    suggestions = ['TYT netimi hesapla', 'AYT hesaplama yap', 'Çalışma tavsiyesi al'];
                    break;
                default:
                    // Use OpenAI for general queries
                    const openaiResponse = await this.generateOpenAIResponse({
                        prompt: userMessage,
                        maxTokens: 300,
                        temperature: 0.7
                    });
                    content = openaiResponse.content;
                    suggestions = this.generateContextualSuggestions(intent, entities);
            }
            return {
                content,
                intent,
                entities,
                suggestions,
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                model: this.config.model
            };
        }
        catch (error) {
            logger_1.default.error('Error in AI service:', error);
            return {
                content: 'Üzgünüm, şu anda bir teknik sorun yaşıyorum. Lütfen sorunuzu tekrar sorabilir misiniz?',
                intent: 'error',
                entities: {},
                suggestions: ['Tekrar deneyin', 'Farklı bir soru sorun'],
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                model: this.config.model
            };
        }
    }
    /**
     * Generate response using OpenAI GPT API (internal method)
     */
    async generateOpenAIResponse(request) {
        try {
            logger_1.default.info('Generating OpenAI response', {
                promptLength: request.prompt.length,
                maxTokens: request.maxTokens || this.config.maxTokens
            });
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: this.buildMessages(request.prompt, request.context),
                    max_tokens: request.maxTokens || this.config.maxTokens,
                    temperature: request.temperature || this.config.temperature,
                    top_p: 1,
                    frequency_penalty: 0,
                    presence_penalty: 0
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }
            const data = await response.json();
            const result = {
                content: data.choices[0]?.message?.content || '',
                intent: 'general',
                entities: {},
                suggestions: [],
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0
                },
                model: data.model
            };
            logger_1.default.info('OpenAI response generated', {
                contentLength: result.content.length,
                usage: result.usage
            });
            return result;
        }
        catch (error) {
            logger_1.default.error('Error generating OpenAI response', { error });
            throw error;
        }
    }
    /**
     * Generate clarification questions for incomplete user queries
     */
    async generateClarificationQuestions(userQuery, missingEntities) {
        const prompt = this.buildClarificationPrompt(userQuery, missingEntities);
        const response = await this.generateOpenAIResponse({
            prompt,
            maxTokens: 200,
            temperature: 0.7
        });
        return this.parseClarificationResponse(response.content);
    }
    /**
     * Generate helpful suggestions based on user context
     */
    async generateSuggestions(context) {
        const prompt = this.buildSuggestionsPrompt(context);
        const response = await this.generateOpenAIResponse({
            prompt,
            maxTokens: 150,
            temperature: 0.8
        });
        return this.parseSuggestionsResponse(response.content);
    }
    /**
     * Generate natural language explanation for calculation results
     */
    async generateCalculationExplanation(university, department, calculationResult) {
        const prompt = this.buildCalculationExplanationPrompt(university, department, calculationResult);
        const response = await this.generateOpenAIResponse({
            prompt,
            maxTokens: 300,
            temperature: 0.5
        });
        return response.content;
    }
    /**
     * Build messages array for chat completion
     */
    buildMessages(prompt, context) {
        const messages = [
            {
                role: 'system',
                content: this.getSystemPrompt()
            }
        ];
        if (context) {
            messages.push({
                role: 'user',
                content: `Bağlam: ${context}`
            });
        }
        messages.push({
            role: 'user',
            content: prompt
        });
        return messages;
    }
    /**
     * Intent classification
     */
    classifyIntent(message) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('tyt'))
            return 'tyt_calculation';
        if (lowerMessage.includes('ayt'))
            return 'ayt_calculation';
        if (lowerMessage.includes('tavsiye') || lowerMessage.includes('başarılı öğrenci'))
            return 'study_advice';
        if (lowerMessage.includes('merhaba') || lowerMessage.includes('selam'))
            return 'greeting';
        if (lowerMessage.includes('net') || lowerMessage.includes('hesap'))
            return 'net_calculation';
        if (lowerMessage.includes('taban puan'))
            return 'base_score';
        if (lowerMessage.includes('kontenjan'))
            return 'quota_inquiry';
        if (lowerMessage.includes('bölüm'))
            return 'department_search';
        return 'general';
    }
    /**
     * Entity extraction
     */
    extractEntities(message) {
        const entities = {};
        const lowerMessage = message.toLowerCase();
        // Extract numbers for TYT/AYT calculations
        const numbers = message.match(/\d+/g);
        if (numbers) {
            entities.numbers = numbers.map(n => parseInt(n));
        }
        // Extract subjects
        if (lowerMessage.includes('matematik'))
            entities.subject = 'matematik';
        if (lowerMessage.includes('türkçe'))
            entities.subject = 'türkçe';
        if (lowerMessage.includes('fen'))
            entities.subject = 'fen';
        if (lowerMessage.includes('sosyal'))
            entities.subject = 'sosyal';
        if (lowerMessage.includes('fizik'))
            entities.subject = 'fizik';
        if (lowerMessage.includes('kimya'))
            entities.subject = 'kimya';
        if (lowerMessage.includes('biyoloji'))
            entities.subject = 'biyoloji';
        return entities;
    }
    /**
     * Handle TYT calculation
     */
    async handleTYTCalculation(message, entities) {
        const numbers = entities.numbers || [];
        if (numbers.length === 0) {
            return {
                content: `📊 **TYT Net Hesaplama**

TYT net hesaplaması için doğru ve yanlış sayılarınızı belirtin:

**Örnek kullanım:**
• "TYT Türkçe 35 doğru 5 yanlış"
• "TYT Matematik 30 doğru 10 yanlış"
• "TYT Fen 25 doğru 15 yanlış"
• "TYT Sosyal 20 doğru 5 yanlış"

**TYT Soru Dağılımı:**
• **Türkçe:** 40 soru
• **Matematik:** 40 soru  
• **Fen Bilimleri:** 20 soru
• **Sosyal Bilimler:** 20 soru

Net hesaplama formülü: Doğru - (Yanlış ÷ 4)`,
                suggestions: ['TYT tam hesaplama yap', 'TYT hedef belirleme', 'TYT çalışma tavsiyesi']
            };
        }
        const correct = numbers[0];
        const wrong = numbers.length > 1 ? numbers[1] : 0;
        const net = Math.max(0, correct - (wrong / 4));
        const score = 150 + (net * 3.5);
        const evaluation = net >= 30 ? '🌟 Harika! İyi bir performans.' : '📈 Biraz daha çalışmayla hedeflerinize ulaşabilirsiniz.';
        return {
            content: `📊 **TYT Net Hesaplama Sonucu**

🎯 **Net Sonuçlarınız:**
• **${entities.subject || 'Genel'}:** ${net.toFixed(1)} net (${correct} doğru, ${wrong} yanlış)

📈 **Tahmini TYT Puanı:** ${score.toFixed(1)} puan

💡 **Değerlendirme:**
${evaluation}

🎯 **Hedef Önerileri:**
• TYT Matematik için 30+ net hedefleyin
• Türkçe paragraf sorularına odaklanın
• Düzenli deneme sınavları çözün

AYT hesaplaması da yapmak ister misiniz?`,
            suggestions: ['AYT hesaplama yap', 'TYT çalışma planı', 'Hedef üniversiteler']
        };
    }
    /**
     * Handle AYT calculation
     */
    async handleAYTCalculation(message, entities) {
        const numbers = entities.numbers || [];
        if (numbers.length === 0) {
            return {
                content: `📊 **AYT Net Hesaplama**

AYT net hesaplaması için alan türünüzü ve doğru/yanlış sayılarınızı belirtin:

**SAY Alanı (Sayısal):**
• **Matematik:** 40 soru
• **Fizik:** 14 soru
• **Kimya:** 13 soru
• **Biyoloji:** 13 soru

**EA Alanı (Eşit Ağırlık):**
• **Matematik:** 40 soru
• **Edebiyat:** 24 soru
• **Tarih:** 10 soru
• **Coğrafya:** 6 soru

**SÖZ Alanı (Sözel):**
• **Edebiyat:** 24 soru
• **Tarih:** 10 soru
• **Coğrafya:** 6 soru
• **Felsefe:** 12 soru
• **Din:** 6 soru

**Örnek:** "AYT SAY Matematik 35 doğru 5 yanlış"`,
                suggestions: ['AYT SAY hesaplama', 'AYT EA hesaplama', 'AYT SÖZ hesaplama']
            };
        }
        const correct = numbers[0];
        const wrong = numbers.length > 1 ? numbers[1] : 0;
        const net = Math.max(0, correct - (wrong / 4));
        const score = 150 + (net * 4.2);
        const evaluation = net >= 25 ? '🌟 Mükemmel! Çok iyi bir performans.' : '📈 Biraz daha çalışmayla hedeflerinize ulaşabilirsiniz.';
        return {
            content: `📊 **AYT Net Hesaplama Sonucu**

🎯 **Net Sonuçlarınız:**
• **${entities.subject || 'Genel'}:** ${net.toFixed(1)} net (${correct} doğru, ${wrong} yanlış)

📈 **Tahmini AYT Puanı:** ${score.toFixed(1)} puan

💡 **Değerlendirme:**
${evaluation}

🎯 **Hedef Önerileri:**
• AYT Matematik için 30+ net hedefleyin
• Fizik formüllerini sistematik çalışın
• Kimya reaksiyon sorularına odaklanın

Başka bir alan hesaplaması yapmak ister misiniz?`,
            suggestions: ['Farklı alan hesapla', 'AYT çalışma planı', 'Bölüm önerileri']
        };
    }
    /**
     * Handle study advice
     */
    async handleStudyAdvice(message, entities) {
        return {
            content: `🎓 **Başarılı Öğrencilerden Tavsiyeler**

📚 **Aktif Çalışma Tekniği**
Sadece okumak yerine not alarak, özetleyerek ve kendinize sorular sorarak çalışın. Konuyu başkasına anlatabilecek seviyeye getirin.
👤 **Ahmet K. - İTÜ Bilgisayar Mühendisliği** - TYT: 115 net, AYT: 78 net ile İTÜ'ye yerleşti

📚 **Pomodoro Tekniği ile Verimlilik**
25 dakika odaklanarak çalış, 5 dakika mola ver. 4 pomodoro sonrası 30 dakika uzun mola. Bu teknikle konsantrasyonumu çok artırdım.
👤 **Zeynep M. - Boğaziçi İşletme** - EA puan türünde 520 puan alarak Boğaziçi'ne yerleşti

📚 **Hedef Görselleştirme**
Hedef üniversitenizin fotoğrafını çalışma masanıza asın. Her gün o hedefi görün ve motivasyonunuzu yüksek tutun.
👤 **Mehmet L. - ODTÜ Makine Mühendisliği** - SAY puan türünde 485 puan ile ODTÜ'ye yerleşti

💡 **Ek Öneriler:**
• Düzenli çalışma programı oluşturun
• Zayıf olduğunuz konulara odaklanın  
• Deneme sınavlarını düzenli çözün
• Motivasyonunuzu yüksek tutun

Hangi konuda daha detaylı tavsiye almak istersiniz?`,
            suggestions: ['Çalışma yöntemi', 'Zaman yönetimi', 'Motivasyon', 'Sınav stratejisi']
        };
    }
    /**
     * Handle greeting
     */
    handleGreeting() {
        return `Merhaba! 👋 Tercih Sihirbazı'na hoş geldiniz! 

Size üniversite tercihleri konusunda yardımcı olmak için buradayım. Şunları yapabilirim:

📊 **TYT/AYT Hesaplama:** "TYT netimi hesapla" veya "AYT SAY hesaplama"
🎯 **Net Hesaplama:** "Bilgisayar mühendisliği için kaç net gerekir?"
📈 **Taban Puanları:** "İTÜ taban puanları nedir?" (Güncel YÖK Atlas verileri)
🏛️ **Üniversite Bilgileri:** "Boğaziçi Üniversitesi hakkında bilgi ver"
📚 **Bölüm Arama:** "Mühendislik bölümleri nelerdir?"
💡 **Çalışma Tavsiyeleri:** "Başarılı öğrencilerden tavsiye al"

Hangi konuda yardım almak istersiniz?`;
    }
    /**
     * Generate contextual suggestions
     */
    generateContextualSuggestions(intent, entities) {
        const suggestions = {
            'tyt_calculation': ['AYT hesaplama yap', 'TYT çalışma planı', 'Hedef üniversiteler'],
            'ayt_calculation': ['TYT hesaplama yap', 'AYT çalışma planı', 'Bölüm önerileri'],
            'study_advice': ['Çalışma yöntemi', 'Zaman yönetimi', 'Motivasyon', 'Sınav stratejisi'],
            'net_calculation': ['Hedef puanınızı belirtin', 'Hangi sınav türü?', 'Geçmiş yıl verilerini göster'],
            'base_score': ['Kontenjan bilgisi', 'Benzer bölümler', 'Geçmiş yıl karşılaştırması'],
            'greeting': ['TYT netimi hesapla', 'AYT hesaplama yap', 'Çalışma tavsiyesi al'],
            'general': ['TYT netimi hesapla', 'AYT hesaplama', 'Çalışma tavsiyesi']
        };
        return suggestions[intent] || suggestions['general'];
    }
    /**
     * Get system prompt for Tercih Sihirbazı
     */
    getSystemPrompt() {
        return `Sen Tercih Sihirbazı'nın yapay zeka asistanısın. Türk öğrencilere üniversite tercihleri konusunda yardım ediyorsun.

Görevlerin:
1. TYT ve AYT net hesaplamaları yapmak
2. Başarılı öğrencilerden tavsiyeler vermek
3. Öğrencilerin sorularını anlayıp net hesaplama, taban puan ve kontenjan bilgileri sağlamak
4. Eksik bilgi olduğunda nazik ve yardımcı sorular sormak
5. Hesaplama sonuçlarını açık ve anlaşılır şekilde açıklamak
6. Türkçe dilinde doğal ve samimi bir şekilde iletişim kurmak

Kurallar:
- Her zaman Türkçe yanıt ver
- Kısa ve öz cevaplar ver
- Öğrencilere karşı destekleyici ve pozitif ol
- Belirsizlik durumunda açıklayıcı sorular sor
- YÖK Atlas verilerine dayalı bilgiler ver
- TYT/AYT hesaplamalarında net formülünü kullan: Doğru - (Yanlış ÷ 4)`;
    }
    /**
     * Build prompt for clarification questions
     */
    buildClarificationPrompt(userQuery, missingEntities) {
        const entityDescriptions = {
            university: 'üniversite',
            department: 'bölüm',
            scoreType: 'puan türü (SAY, EA, SÖZ, DIL)',
            language: 'öğretim dili'
        };
        const missingDescriptions = missingEntities
            .map(entity => entityDescriptions[entity] || entity)
            .join(', ');
        return `Kullanıcı şu soruyu sordu: "${userQuery}"

Bu soruyu yanıtlamak için şu bilgiler eksik: ${missingDescriptions}

Bu eksik bilgileri öğrenmek için 2-3 kısa ve net soru oluştur. Sorular Türkçe olsun ve öğrenciye yardımcı bir tonda olsun.

Format: Her satırda bir soru, "?" ile bitsin.`;
    }
    /**
     * Build prompt for suggestions
     */
    buildSuggestionsPrompt(context) {
        return `Kullanıcının mevcut durumu: ${context}

Bu duruma göre kullanıcıya 3-4 yararlı öneri ver. Öneriler şunlar hakkında olabilir:
- Sorabilecekleri sorular
- Yapabilecekleri hesaplamalar
- Araştırabilecekleri konular

Her öneri kısa ve net olsun, Türkçe yazılsın.

Format: Her satırda bir öneri, "•" ile başlasın.`;
    }
    /**
     * Build prompt for calculation explanation
     */
    buildCalculationExplanationPrompt(university, department, calculationResult) {
        return `${university} ${department} bölümü için net hesaplama sonucu:

Hedef Puan: ${calculationResult.targetScore}
Güvenlik Marjı: %${calculationResult.safetyMargin * 100}
Gerekli Netler: ${JSON.stringify(calculationResult.requiredNets)}
Güven Seviyesi: ${calculationResult.confidence}

Bu sonuçları öğrenciye açık ve anlaşılır şekilde açıkla. Türkçe, samimi ve destekleyici bir dil kullan. 
Sonuçların ne anlama geldiğini ve öğrencinin nasıl çalışması gerektiğini belirt.`;
    }
    /**
     * Parse clarification response into questions array
     */
    parseClarificationResponse(response) {
        return response
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.includes('?'))
            .map(line => line.replace(/^[-•*]\s*/, ''))
            .slice(0, 3); // Limit to 3 questions
    }
    /**
     * Parse suggestions response into suggestions array
     */
    parseSuggestionsResponse(response) {
        return response
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^[-•*]\s*/, ''))
            .slice(0, 4); // Limit to 4 suggestions
    }
    /**
     * Validate API configuration
     */
    validateConfig() {
        if (!this.config.apiKey || this.config.apiKey.trim() === '') {
            logger_1.default.error('OpenAI API key is missing');
            return false;
        }
        if (!this.config.model || this.config.model.trim() === '') {
            logger_1.default.error('OpenAI model is not specified');
            return false;
        }
        if (this.config.maxTokens <= 0 || this.config.maxTokens > 4096) {
            logger_1.default.error('Invalid maxTokens configuration', { maxTokens: this.config.maxTokens });
            return false;
        }
        if (this.config.temperature < 0 || this.config.temperature > 2) {
            logger_1.default.error('Invalid temperature configuration', { temperature: this.config.temperature });
            return false;
        }
        return true;
    }
    /**
     * Test API connection
     */
    async testConnection() {
        try {
            const response = await this.generateOpenAIResponse({
                prompt: 'Test',
                maxTokens: 10,
                temperature: 0
            });
            return response.content.length > 0;
        }
        catch (error) {
            logger_1.default.error('OpenAI connection test failed', { error });
            return false;
        }
    }
}
exports.OpenAIService = OpenAIService;
//# sourceMappingURL=OpenAIService.js.map
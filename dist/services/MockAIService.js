"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAIService = void 0;
const logger_1 = __importDefault(require("@/utils/logger"));
const DataService_1 = require("./DataService");
const CacheService_1 = require("./CacheService");
const NetCalculatorService_1 = require("./NetCalculatorService");
const IntentClassifier_1 = require("./IntentClassifier");
const EntityExtractor_1 = require("./EntityExtractor");
class MockAIService {
    constructor() {
        this.dataService = new DataService_1.DataService(new CacheService_1.CacheService());
        this.calculatorService = new NetCalculatorService_1.NetCalculatorService();
        this.intentClassifier = new IntentClassifier_1.IntentClassifier();
        this.entityExtractor = new EntityExtractor_1.EntityExtractor();
    }
    async generateResponse(userMessage, sessionId) {
        try {
            // 1. Intent ve entity analizi
            const intent = this.intentClassifier.classifyIntent(userMessage);
            const entityMatches = this.entityExtractor.extractEntities(userMessage, ['department', 'university', 'scoreType', 'numbers']);
            // Convert entity matches to simple object
            const entities = {};
            entityMatches.forEach(match => {
                if (match.entity === 'turkish' || match.entity === 'math' || match.entity === 'science' ||
                    match.entity === 'social' || match.entity === 'physics' || match.entity === 'chemistry' ||
                    match.entity === 'biology' || match.entity === 'literature' || match.entity === 'history' ||
                    match.entity === 'geography' || match.entity === 'philosophy' || match.entity === 'religion') {
                    try {
                        const parsed = JSON.parse(match.value);
                        entities[match.entity] = parsed.correct;
                        if (parsed.wrong > 0) {
                            entities[match.entity + '_wrong'] = parsed.wrong;
                        }
                    }
                    catch {
                        entities[match.entity] = parseInt(match.value) || 0;
                    }
                }
                else if (!entities[match.entity]) {
                    entities[match.entity] = match.value;
                }
            });
            logger_1.default.info(`AI Processing: intent="${intent.intent}", entities=${JSON.stringify(entities)}`);
            // 2. Intent'e göre response oluştur
            let response;
            switch (intent.intent) {
                case 'net_calculation':
                    response = await this.handleNetCalculation(entities);
                    break;
                case 'tyt_calculation':
                    response = await this.handleTYTCalculation(entities);
                    break;
                case 'ayt_calculation':
                    response = await this.handleAYTCalculation(entities);
                    break;
                case 'study_advice':
                    response = await this.handleStudyAdvice(entities);
                    break;
                case 'base_score':
                    response = await this.handleBaseScoreInquiry(entities);
                    break;
                case 'department_search':
                    response = await this.handleDepartmentSearch(entities);
                    break;
                case 'university_info':
                    response = await this.handleUniversityInfo(entities);
                    break;
                case 'quota_inquiry':
                    response = await this.handleQuotaInquiry(entities);
                    break;
                case 'greeting':
                    response = this.handleGreeting();
                    break;
                case 'thanks':
                    response = this.handleThanks();
                    break;
                default:
                    response = await this.handleGeneral(userMessage, entities);
            }
            response.intent = intent.intent;
            response.entities = entities;
            return response;
        }
        catch (error) {
            logger_1.default.error('Error in AI service:', error);
            return {
                content: 'Üzgünüm, şu anda bir teknik sorun yaşıyorum. Lütfen sorunuzu tekrar sorabilir misiniz?',
                intent: 'error',
                entities: {},
                suggestions: ['Tekrar deneyin', 'Farklı bir soru sorun']
            };
        }
    }
    async handleNetCalculation(entities) {
        const department = entities.department;
        const university = entities.university;
        const scoreType = entities.scoreType || 'SAY';
        if (!department) {
            return {
                content: `Net hesaplama yapabilmem için hangi bölümü merak ettiğinizi belirtmeniz gerekiyor. 

Örneğin:
• "Bilgisayar Mühendisliği için kaç net gerekir?"
• "İTÜ Makine Mühendisliği net hesaplama"
• "Tıp Fakültesi için kaç soru doğru yapmam gerek?"`,
                intent: 'net_calculation',
                entities,
                suggestions: [
                    'Bilgisayar Mühendisliği net hesaplama',
                    'Tıp Fakültesi kaç net gerekir',
                    'Hukuk bölümü net hesaplama'
                ]
            };
        }
        try {
            // Mock data ile net hesaplama
            const mockCalculation = this.getMockNetCalculation(department, university, scoreType);
            return {
                content: `📊 **${department}** ${university ? `(${university})` : ''} için net hesaplama:

🎯 **${scoreType} Puan Türü için:**
• **Gerekli Net:** ${mockCalculation.requiredNets.total} net
• **Matematik:** ${mockCalculation.requiredNets.math} net
• **Fen:** ${mockCalculation.requiredNets.science} net  
• **Türkçe:** ${mockCalculation.requiredNets.turkish} net

📈 **Puan Bilgileri:**
• **Taban Puan:** ${mockCalculation.baseScore} puan
• **Tavan Puan:** ${mockCalculation.ceilingScore} puan
• **Kontenjan:** ${mockCalculation.quota} kişi

💡 **Tavsiyeler:**
• Güvenli tercih için ${mockCalculation.requiredNets.total + 5} net hedefleyin
• Matematik ağırlığı yüksek, matematik çalışmaya odaklanın
• Son 3 yılın ortalamasına göre hesaplanmıştır

Başka bir bölüm veya üniversite için hesaplama yapmamı ister misiniz?`,
                intent: 'net_calculation',
                entities,
                suggestions: [
                    'Başka bölüm hesapla',
                    'Bu bölümün diğer üniversitelerdeki durumu',
                    'Alternatif bölümler öner'
                ]
            };
        }
        catch (error) {
            return {
                content: `${department} bölümü için net hesaplama yaparken bir sorun oluştu. Lütfen bölüm adını kontrol edip tekrar deneyin.`,
                intent: 'net_calculation',
                entities,
                suggestions: ['Bölüm adını kontrol et', 'Başka bölüm dene']
            };
        }
    }
    async handleBaseScoreInquiry(entities) {
        const department = entities.department;
        const university = entities.university;
        if (!department && !university) {
            return {
                content: `Taban puan bilgisi için hangi bölüm veya üniversiteyi merak ettiğinizi belirtin.

Örneğin:
• "İTÜ Bilgisayar Mühendisliği taban puanı"
• "Tıp Fakültesi taban puanları"
• "Boğaziçi Üniversitesi taban puanları"`,
                intent: 'base_score',
                entities,
                suggestions: [
                    'İTÜ taban puanları',
                    'Tıp Fakültesi taban puanları',
                    'Mühendislik bölümleri taban puanları'
                ]
            };
        }
        const mockData = this.getMockScoreData(department, university);
        return {
            content: `📊 **Taban Puan Bilgileri** ${university ? `- ${university}` : ''}

${mockData.map(item => `
🎓 **${item.department}**
• **SAY:** ${item.scores.SAY} puan (${item.ranks.SAY} sıralama)
• **EA:** ${item.scores.EA} puan (${item.ranks.EA} sıralama)
• **Kontenjan:** ${item.quota} kişi
• **Dil:** ${item.language}
`).join('\n')}

📈 **Trend Analizi:**
• Geçen yıla göre ortalama 15-20 puan artış
• Kontenjanlar sabit kaldı
• Rekabet yoğunluğu arttı

💡 **Öneriler:**
• Güvenli tercih için taban puanın 20-30 puan üstünü hedefleyin
• Alternatif üniversiteleri de değerlendirin
• Burs imkanlarını araştırın

Başka üniversite veya bölüm bilgisi ister misiniz?`,
            intent: 'base_score',
            entities,
            suggestions: [
                'Alternatif üniversiteler',
                'Burs imkanları',
                'Geçen yıl karşılaştırması'
            ]
        };
    }
    async handleDepartmentSearch(entities) {
        const university = entities.university;
        const field = entities.field || entities.department;
        if (!university && !field) {
            return {
                content: `Hangi üniversitenin bölümlerini veya hangi alanda bölümleri merak ediyorsunuz?

Örneğin:
• "İTÜ'de hangi bölümler var?"
• "Mühendislik bölümleri nelerdir?"
• "Sağlık alanında hangi bölümler var?"`,
                intent: 'department_search',
                entities,
                suggestions: [
                    'İTÜ bölümleri',
                    'Mühendislik bölümleri',
                    'Sağlık bölümleri'
                ]
            };
        }
        const mockDepartments = this.getMockDepartments(university, field);
        return {
            content: `🎓 **Bölüm Listesi** ${university ? `- ${university}` : field ? `- ${field} Alanı` : ''}

${mockDepartments.map(dept => `
📚 **${dept.name}**
• **Fakülte:** ${dept.faculty}
• **Dil:** ${dept.language}
• **Taban Puan:** ${dept.baseScore} (${dept.scoreType})
• **Kontenjan:** ${dept.quota} kişi
• **Özellik:** ${dept.feature}
`).join('\n')}

💡 **Seçim Kriterleri:**
• İş imkanları ve sektör durumu
• Üniversitenin akademik kadrosu
• Laboratuvar ve teknik donanım
• Mezun memnuniyeti

Herhangi bir bölüm hakkında detaylı bilgi almak ister misiniz?`,
            intent: 'department_search',
            entities,
            suggestions: [
                'Bölüm detayları',
                'İş imkanları',
                'Benzer bölümler'
            ]
        };
    }
    async handleUniversityInfo(entities) {
        const university = entities.university;
        if (!university) {
            return {
                content: `Hangi üniversite hakkında bilgi almak istiyorsunuz?

Popüler üniversiteler:
• İstanbul Teknik Üniversitesi (İTÜ)
• Boğaziçi Üniversitesi
• Orta Doğu Teknik Üniversitesi (ODTÜ)
• İstanbul Üniversitesi
• Ankara Üniversitesi`,
                intent: 'university_info',
                entities,
                suggestions: [
                    'İTÜ hakkında bilgi',
                    'Boğaziçi Üniversitesi',
                    'ODTÜ bilgileri'
                ]
            };
        }
        const mockInfo = this.getMockUniversityInfo(university);
        return {
            content: `🏛️ **${mockInfo.name}** Hakkında

📍 **Genel Bilgiler:**
• **Kuruluş:** ${mockInfo.founded}
• **Şehir:** ${mockInfo.city}
• **Tür:** ${mockInfo.type}
• **Öğrenci Sayısı:** ${mockInfo.studentCount}

🎓 **Akademik Bilgiler:**
• **Fakülte Sayısı:** ${mockInfo.facultyCount}
• **Bölüm Sayısı:** ${mockInfo.departmentCount}
• **Popüler Bölümler:** ${mockInfo.popularDepartments.join(', ')}

🏆 **Öne Çıkan Özellikler:**
${mockInfo.features.map(feature => `• ${feature}`).join('\n')}

📊 **Sıralama Bilgileri:**
• **Ulusal Sıralama:** ${mockInfo.nationalRank}
• **Uluslararası Sıralama:** ${mockInfo.internationalRank}

Bu üniversitenin belirli bir bölümü hakkında bilgi almak ister misiniz?`,
            intent: 'university_info',
            entities,
            suggestions: [
                `${university} bölümleri`,
                `${university} taban puanları`,
                'Kampüs yaşamı'
            ]
        };
    }
    async handleQuotaInquiry(entities) {
        const department = entities.department;
        const university = entities.university;
        const mockQuotas = this.getMockQuotaInfo(department, university);
        return {
            content: `📊 **Kontenjan Bilgileri** ${university ? `- ${university}` : ''}

${mockQuotas.map(item => `
🎓 **${item.department}**
• **Toplam Kontenjan:** ${item.totalQuota} kişi
• **Genel Kontenjan:** ${item.generalQuota} kişi
• **Özel Kontenjanlar:**
  - Engelli: ${item.disabledQuota} kişi
  - Ek Yerleştirme: ${item.additionalQuota} kişi
• **Yerleşen:** ${item.enrolled} kişi
• **Doluluk Oranı:** %${item.fillRate}
`).join('\n')}

📈 **Kontenjan Analizi:**
• Geçen yıla göre %5 artış
• Doluluk oranı yüksek - rekabet yoğun
• Ek yerleştirmede şans var

💡 **Strateji Önerileri:**
• Bu bölümü güvenli tercih olarak değerlendirin
• Alternatif üniversiteleri de listeleyin
• Ek yerleştirme dönemini takip edin

Başka bölüm kontenjanlarını merak ediyor musunuz?`,
            intent: 'quota_inquiry',
            entities,
            suggestions: [
                'Alternatif bölümler',
                'Ek yerleştirme bilgileri',
                'Geçmiş yıl karşılaştırması'
            ]
        };
    }
    handleGreeting() {
        const greetings = [
            `Merhaba! 👋 Tercih Sihirbazı'na hoş geldiniz! 

Size üniversite tercihleri konusunda yardımcı olmak için buradayım. Şunları yapabilirim:

📊 **TYT/AYT Hesaplama:** "TYT netimi hesapla" veya "AYT SAY hesaplama"
🎯 **Net Hesaplama:** "Bilgisayar mühendisliği için kaç net gerekir?"
📈 **Taban Puanları:** "İTÜ taban puanları nedir?" (Güncel YÖK Atlas verileri)
🏛️ **Üniversite Bilgileri:** "Boğaziçi Üniversitesi hakkında bilgi ver"
�  **Bölüm Arama:** "Mühendislik bölümleri nelerdir?"
💡 **Çalışma Tavsiyeleri:** "Başarılı öğrencilerden tavsiye al"

Hangi konuda yardım almak istersiniz?`,
            `Selam! 🌟 Üniversite tercih sürecinizde yanınızdayım!

Merak ettiğiniz her şeyi sorabilirsiniz:
• TYT ve AYT net hesaplamaları
• Güncel taban puan bilgileri (YÖK Atlas)
• Üniversite ve bölüm detayları
• Başarılı öğrencilerden tavsiyeler
• Tercih stratejileri

Hadi başlayalım! Ne öğrenmek istiyorsunuz?`
        ];
        return {
            content: greetings[Math.floor(Math.random() * greetings.length)],
            intent: 'greeting',
            entities: {},
            suggestions: [
                'TYT netimi hesapla',
                'AYT hesaplama yap',
                'Taban puanları göster',
                'Çalışma tavsiyesi al'
            ]
        };
    }
    handleThanks() {
        const responses = [
            `Rica ederim! 😊 

Başka sorularınız olursa çekinmeden sorun. Size yardımcı olmak için buradayım!

🎓 Tercih sürecinizde başarılar dilerim!`,
            `Ne demek! 🌟

Üniversite tercih sürecinde her zaman yanınızdayım. Aklınıza takılan başka sorular olursa sormaktan çekinmeyin!`
        ];
        return {
            content: responses[Math.floor(Math.random() * responses.length)],
            intent: 'thanks',
            entities: {},
            suggestions: [
                'Başka soru sor',
                'Tercih stratejisi',
                'Bölüm karşılaştırması'
            ]
        };
    }
    async handleGeneral(userMessage, entities) {
        // Genel sorular için basit pattern matching
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage.includes('nasıl') && lowerMessage.includes('tercih')) {
            return {
                content: `🎯 **Tercih Stratejisi Rehberi:**

**1. Kendini Tanı:**
• İlgi alanlarını belirle
• Yeteneklerini değerlendir
• Kariyer hedeflerini netleştir

**2. Araştırma Yap:**
• Bölüm müfredatlarını incele
• İş imkanlarını araştır
• Mezun görüşlerini dinle

**3. Tercih Listesi Oluştur:**
• %30 güvenli tercih
• %40 hedef tercih  
• %30 hayali tercih

**4. Puan Hesapla:**
• Net hedeflerini belirle
• Taban puanları karşılaştır
• Güvenlik payı bırak

Hangi aşamada yardım istiyorsunuz?`,
                intent: 'general',
                entities,
                suggestions: [
                    'Bölüm seçimi nasıl yapılır',
                    'Net hedefi belirleme',
                    'Tercih listesi oluşturma'
                ]
            };
        }
        return {
            content: `Anladığım kadarıyla "${userMessage}" hakkında bilgi istiyorsunuz.

Size daha iyi yardımcı olabilmem için sorunuzu şu şekillerde sorabilirsiniz:

📊 **TYT/AYT Hesaplama:** 
• "TYT Matematik 35 doğru 5 yanlış"
• "AYT SAY hesaplama yap"

🎯 **Net Hesaplama:** "X bölümü için kaç net gerekir?"
📈 **Taban Puanları:** "Y üniversitesi taban puanları" (Güncel YÖK Atlas verileri)
🏛️ **Üniversite Bilgisi:** "Z üniversitesi hakkında bilgi"
📚 **Bölüm Arama:** "Mühendislik bölümleri nelerdir?"
💡 **Çalışma Tavsiyeleri:** "Başarılı öğrencilerden tavsiye"

Hangi konuda yardım almak istersiniz?`,
            intent: 'general',
            entities,
            suggestions: [
                'TYT netimi hesapla',
                'AYT hesaplama',
                'Taban puanları',
                'Çalışma tavsiyesi'
            ]
        };
    }
    // TYT ve AYT hesaplama metodları
    async handleTYTCalculation(entities) {
        const turkish = entities.turkish || 0;
        const math = entities.math || 0;
        const science = entities.science || 0;
        const social = entities.social || 0;
        if (!turkish && !math && !science && !social) {
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
                intent: 'tyt_calculation',
                entities,
                suggestions: [
                    'TYT tam hesaplama yap',
                    'TYT hedef belirleme',
                    'TYT çalışma tavsiyesi'
                ]
            };
        }
        const tytResult = this.calculateTYT(turkish, math, science, social);
        return {
            content: `📊 **TYT Net Hesaplama Sonucu**

🎯 **Net Sonuçlarınız:**
• **Türkçe:** ${tytResult.turkish.net} net (${tytResult.turkish.correct} doğru, ${tytResult.turkish.wrong} yanlış)
• **Matematik:** ${tytResult.math.net} net (${tytResult.math.correct} doğru, ${tytResult.math.wrong} yanlış)
• **Fen:** ${tytResult.science.net} net (${tytResult.science.correct} doğru, ${tytResult.science.wrong} yanlış)
• **Sosyal:** ${tytResult.social.net} net (${tytResult.social.correct} doğru, ${tytResult.social.wrong} yanlış)

📈 **Toplam TYT Neti:** ${tytResult.totalNet} net
📊 **Tahmini TYT Puanı:** ${tytResult.score.toFixed(1)} puan

💡 **Değerlendirme:**
${this.getTYTEvaluation(tytResult.totalNet)}

🎯 **Hedef Önerileri:**
${this.getTYTTargetSuggestions(tytResult)}

AYT hesaplaması da yapmak ister misiniz?`,
            intent: 'tyt_calculation',
            entities,
            suggestions: [
                'AYT hesaplama yap',
                'TYT çalışma planı',
                'Hedef üniversiteler'
            ]
        };
    }
    async handleAYTCalculation(entities) {
        const math = entities.math || 0;
        const physics = entities.physics || 0;
        const chemistry = entities.chemistry || 0;
        const biology = entities.biology || 0;
        if (!math && !physics && !chemistry && !biology) {
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
                intent: 'ayt_calculation',
                entities,
                suggestions: [
                    'AYT SAY hesaplama',
                    'AYT EA hesaplama',
                    'AYT SÖZ hesaplama'
                ]
            };
        }
        const aytResult = this.calculateAYT(math, physics, chemistry, biology);
        return {
            content: `📊 **AYT Net Hesaplama Sonucu**

🎯 **Net Sonuçlarınız:**
• **Matematik:** ${aytResult.math.net} net (${aytResult.math.correct} doğru, ${aytResult.math.wrong} yanlış)
• **Fizik:** ${aytResult.physics.net} net (${aytResult.physics.correct} doğru, ${aytResult.physics.wrong} yanlış)
• **Kimya:** ${aytResult.chemistry.net} net (${aytResult.chemistry.correct} doğru, ${aytResult.chemistry.wrong} yanlış)
• **Biyoloji:** ${aytResult.biology.net} net (${aytResult.biology.correct} doğru, ${aytResult.biology.wrong} yanlış)

📈 **Toplam AYT Neti:** ${aytResult.totalNet} net
📊 **Tahmini AYT Puanı:** ${aytResult.score.toFixed(1)} puan

💡 **Değerlendirme:**
${this.getAYTEvaluation(aytResult.totalNet)}

🎯 **Hedef Önerileri:**
${this.getAYTTargetSuggestions(aytResult)}

Başka bir alan hesaplaması yapmak ister misiniz?`,
            intent: 'ayt_calculation',
            entities,
            suggestions: [
                'Farklı alan hesapla',
                'AYT çalışma planı',
                'Bölüm önerileri'
            ]
        };
    }
    async handleStudyAdvice(entities) {
        const category = entities.category || 'general';
        const subject = entities.subject;
        const advices = this.getStudentAdvices(category, subject);
        return {
            content: `🎓 **Başarılı Öğrencilerden Tavsiyeler**

${advices.map(advice => `
📚 **${advice.title}**
${advice.content}

👤 **${advice.author}** - ${advice.success_story}
`).join('\n')}

💡 **Ek Öneriler:**
• Düzenli çalışma programı oluşturun
• Zayıf olduğunuz konulara odaklanın  
• Deneme sınavlarını düzenli çözün
• Motivasyonunuzu yüksek tutun

Hangi konuda daha detaylı tavsiye almak istersiniz?`,
            intent: 'study_advice',
            entities,
            suggestions: [
                'Çalışma yöntemi',
                'Zaman yönetimi',
                'Motivasyon',
                'Sınav stratejisi'
            ]
        };
    }
    // Hesaplama metodları
    calculateTYT(turkish, math, science, social) {
        const calculateNet = (correct, wrong) => {
            return Math.max(0, correct - (wrong / 4));
        };
        const turkishNet = calculateNet(turkish, Math.max(0, 40 - turkish));
        const mathNet = calculateNet(math, Math.max(0, 40 - math));
        const scienceNet = calculateNet(science, Math.max(0, 20 - science));
        const socialNet = calculateNet(social, Math.max(0, 20 - social));
        const totalNet = turkishNet + mathNet + scienceNet + socialNet;
        // TYT puan hesaplama (yaklaşık formül)
        const score = 150 + (totalNet * 3.5);
        return {
            turkish: { correct: turkish, wrong: Math.max(0, 40 - turkish), net: turkishNet },
            math: { correct: math, wrong: Math.max(0, 40 - math), net: mathNet },
            science: { correct: science, wrong: Math.max(0, 20 - science), net: scienceNet },
            social: { correct: social, wrong: Math.max(0, 20 - social), net: socialNet },
            totalNet,
            score
        };
    }
    calculateAYT(math, physics, chemistry, biology) {
        const calculateNet = (correct, totalQuestions) => {
            const wrong = Math.max(0, totalQuestions - correct);
            return Math.max(0, correct - (wrong / 4));
        };
        const mathNet = calculateNet(math, 40);
        const physicsNet = calculateNet(physics, 14);
        const chemistryNet = calculateNet(chemistry, 13);
        const biologyNet = calculateNet(biology, 13);
        const totalNet = mathNet + physicsNet + chemistryNet + biologyNet;
        // AYT puan hesaplama (yaklaşık formül)
        const score = 150 + (totalNet * 4.2);
        return {
            math: { correct: math, wrong: Math.max(0, 40 - math), net: mathNet },
            physics: { correct: physics, wrong: Math.max(0, 14 - physics), net: physicsNet },
            chemistry: { correct: chemistry, wrong: Math.max(0, 13 - chemistry), net: chemistryNet },
            biology: { correct: biology, wrong: Math.max(0, 13 - biology), net: biologyNet },
            literature: { correct: 0, wrong: 0, net: 0 },
            history: { correct: 0, wrong: 0, net: 0 },
            geography: { correct: 0, wrong: 0, net: 0 },
            philosophy: { correct: 0, wrong: 0, net: 0 },
            religion: { correct: 0, wrong: 0, net: 0 },
            totalNet,
            score
        };
    }
    getTYTEvaluation(totalNet) {
        if (totalNet >= 100) {
            return "🌟 Mükemmel! Çok yüksek bir TYT performansı gösteriyorsunuz.";
        }
        else if (totalNet >= 80) {
            return "🎯 Harika! İyi bir TYT performansınız var, hedef üniversitelere ulaşabilirsiniz.";
        }
        else if (totalNet >= 60) {
            return "📈 İyi! Biraz daha çalışmayla hedeflerinize ulaşabilirsiniz.";
        }
        else if (totalNet >= 40) {
            return "💪 Orta seviye. Çalışma planınızı gözden geçirmeniz faydalı olacak.";
        }
        else {
            return "🎯 Başlangıç seviyesi. Temel konulara odaklanarak ilerleyebilirsiniz.";
        }
    }
    getAYTEvaluation(totalNet) {
        if (totalNet >= 70) {
            return "🌟 Mükemmel! Çok yüksek bir AYT performansı gösteriyorsunuz.";
        }
        else if (totalNet >= 55) {
            return "🎯 Harika! İyi bir AYT performansınız var.";
        }
        else if (totalNet >= 40) {
            return "📈 İyi! Biraz daha çalışmayla hedeflerinize ulaşabilirsiniz.";
        }
        else if (totalNet >= 25) {
            return "💪 Orta seviye. Zayıf alanlarınıza odaklanın.";
        }
        else {
            return "🎯 Başlangıç seviyesi. Temel konuları güçlendirin.";
        }
    }
    getTYTTargetSuggestions(result) {
        const suggestions = [];
        if (result.math.net < 25) {
            suggestions.push("• Matematik çalışmaya öncelik verin (hedef: 30+ net)");
        }
        if (result.turkish.net < 25) {
            suggestions.push("• Türkçe paragraf sorularına odaklanın (hedef: 30+ net)");
        }
        if (result.science.net < 12) {
            suggestions.push("• Fen konularını sistematik çalışın (hedef: 15+ net)");
        }
        if (result.social.net < 12) {
            suggestions.push("• Sosyal bilimler için düzenli tekrar yapın (hedef: 15+ net)");
        }
        return suggestions.length > 0 ? suggestions.join('\n') : "• Mevcut performansınızı koruyarak devam edin";
    }
    getAYTTargetSuggestions(result) {
        const suggestions = [];
        if (result.math.net < 25) {
            suggestions.push("• AYT Matematik için daha fazla soru çözün (hedef: 30+ net)");
        }
        if (result.physics.net < 8) {
            suggestions.push("• Fizik konularını formüllerle birlikte çalışın (hedef: 10+ net)");
        }
        if (result.chemistry.net < 8) {
            suggestions.push("• Kimya için reaksiyon ve hesaplama sorularına odaklanın (hedef: 10+ net)");
        }
        if (result.biology.net < 8) {
            suggestions.push("• Biyoloji için sistematik ezber ve anlama çalışması yapın (hedef: 10+ net)");
        }
        return suggestions.length > 0 ? suggestions.join('\n') : "• Mevcut performansınızı koruyarak devam edin";
    }
    getStudentAdvices(category, subject) {
        const allAdvices = [
            {
                category: 'study_method',
                title: 'Aktif Çalışma Tekniği',
                content: 'Sadece okumak yerine not alarak, özetleyerek ve kendinize sorular sorarak çalışın. Konuyu başkasına anlatabilecek seviyeye getirin.',
                author: 'Ahmet K. - İTÜ Bilgisayar Mühendisliği',
                success_story: 'TYT: 115 net, AYT: 78 net ile İTÜ\'ye yerleşti'
            },
            {
                category: 'time_management',
                title: 'Pomodoro Tekniği ile Verimlilik',
                content: '25 dakika odaklanarak çalış, 5 dakika mola ver. 4 pomodoro sonrası 30 dakika uzun mola. Bu teknikle konsantrasyonumu çok artırdım.',
                author: 'Zeynep M. - Boğaziçi İşletme',
                success_story: 'EA puan türünde 520 puan alarak Boğaziçi\'ne yerleşti'
            },
            {
                category: 'motivation',
                title: 'Hedef Görselleştirme',
                content: 'Hedef üniversitenizin fotoğrafını çalışma masanıza asın. Her gün o hedefi görün ve motivasyonunuzu yüksek tutun.',
                author: 'Mehmet L. - ODTÜ Makine Mühendisliği',
                success_story: 'SAY puan türünde 485 puan ile ODTÜ\'ye yerleşti'
            },
            {
                category: 'exam_strategy',
                title: 'Sınav Sırası Stratejisi',
                content: 'Kolay sorulardan başlayın, zor sorularda takılmayın. Zaman yönetimi çok önemli. Son 15 dakikayı optik kontrol için ayırın.',
                author: 'Ayşe T. - Hacettepe Tıp',
                success_story: 'SAY puan türünde 550+ puan ile Hacettepe Tıp\'a yerleşti'
            },
            {
                category: 'subject_specific',
                title: 'Matematik için Günlük Pratik',
                content: 'Her gün en az 20 matematik sorusu çözün. Yanlış yaptığınız soruları not alın ve haftada bir tekrar edin.',
                author: 'Can Y. - İTÜ Matematik Mühendisliği',
                success_story: 'AYT Matematik 38 net ile İTÜ\'ye yerleşti'
            }
        ];
        if (category === 'general') {
            return allAdvices.slice(0, 3);
        }
        return allAdvices.filter(advice => advice.category === category);
    }
    // Mock data methods
    getMockNetCalculation(department, university, scoreType = 'SAY') {
        const baseNets = {
            'bilgisayar mühendisliği': { total: 85, math: 35, science: 30, turkish: 20 },
            'tıp': { total: 95, math: 25, science: 45, turkish: 25 },
            'hukuk': { total: 75, math: 15, science: 10, turkish: 50 },
            'işletme': { total: 70, math: 25, science: 15, turkish: 30 },
            'makine mühendisliği': { total: 80, math: 40, science: 25, turkish: 15 }
        };
        const key = department.toLowerCase();
        const nets = baseNets[key] || { total: 75, math: 30, science: 25, turkish: 20 };
        return {
            requiredNets: nets,
            baseScore: 450 + Math.random() * 100,
            ceilingScore: 500 + Math.random() * 50,
            quota: 80 + Math.floor(Math.random() * 40)
        };
    }
    getMockScoreData(department, university) {
        return [
            {
                department: department || 'Bilgisayar Mühendisliği',
                scores: { SAY: 485.5, EA: 475.2 },
                ranks: { SAY: '15K', EA: '18K' },
                quota: 120,
                language: 'Türkçe'
            },
            {
                department: 'Makine Mühendisliği',
                scores: { SAY: 465.8, EA: 455.1 },
                ranks: { SAY: '25K', EA: '28K' },
                quota: 100,
                language: 'Türkçe'
            }
        ];
    }
    getMockDepartments(university, field) {
        return [
            {
                name: 'Bilgisayar Mühendisliği',
                faculty: 'Mühendislik Fakültesi',
                language: 'Türkçe',
                baseScore: 485.5,
                scoreType: 'SAY',
                quota: 120,
                feature: 'Yüksek iş imkanı'
            },
            {
                name: 'Yazılım Mühendisliği',
                faculty: 'Mühendislik Fakültesi',
                language: '%30 İngilizce',
                baseScore: 475.2,
                scoreType: 'SAY',
                quota: 80,
                feature: 'Güncel müfredat'
            }
        ];
    }
    getMockUniversityInfo(university) {
        return {
            name: university,
            founded: '1773',
            city: 'İstanbul',
            type: 'Devlet',
            studentCount: '35.000',
            facultyCount: 12,
            departmentCount: 85,
            popularDepartments: ['Bilgisayar Mühendisliği', 'Makine Mühendisliği', 'İnşaat Mühendisliği'],
            features: [
                'Güçlü akademik kadro',
                'Modern laboratuvarlar',
                'Sanayi işbirlikleri',
                'Uluslararası değişim programları'
            ],
            nationalRank: '3',
            internationalRank: '500-600'
        };
    }
    getMockQuotaInfo(department, university) {
        return [
            {
                department: department || 'Bilgisayar Mühendisliği',
                totalQuota: 120,
                generalQuota: 108,
                disabledQuota: 6,
                additionalQuota: 6,
                enrolled: 118,
                fillRate: 98
            }
        ];
    }
}
exports.MockAIService = MockAIService;
//# sourceMappingURL=MockAIService.js.map
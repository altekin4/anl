"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDataFallback = exports.generateDataSuggestions = exports.handleDataErrors = exports.DataError = void 0;
const errorHandler_1 = require("@/middleware/errorHandler");
const logger_1 = __importDefault(require("@/utils/logger"));
class DataError extends errorHandler_1.AppError {
    constructor(message, code, statusCode = 400, details) {
        super(message, statusCode, code, details);
    }
}
exports.DataError = DataError;
// Data-specific error handlers
exports.handleDataErrors = {
    universityNotFound: (searchTerm, suggestions) => {
        logger_1.default.warn('University not found', { searchTerm, suggestions });
        return new DataError('Üniversite bulunamadı', 'UNIVERSITY_NOT_FOUND', 404, { searchTerm, suggestions });
    },
    departmentNotFound: (searchTerm, universityName, suggestions) => {
        logger_1.default.warn('Department not found', { searchTerm, universityName, suggestions });
        return new DataError('Bölüm bulunamadı', 'DEPARTMENT_NOT_FOUND', 404, { searchTerm, universityName, suggestions });
    },
    scoreDataNotFound: (universityName, departmentName, year) => {
        logger_1.default.warn('Score data not found', { universityName, departmentName, year });
        return new DataError('Bu bölüm için puan bilgisi bulunamadı', 'SCORE_DATA_NOT_FOUND', 404, { universityName, departmentName, year });
    },
    invalidScoreRange: (minScore, maxScore) => {
        logger_1.default.warn('Invalid score range', { minScore, maxScore });
        return new DataError('Geçersiz puan aralığı', 'INVALID_SCORE_RANGE', 400, { minScore, maxScore });
    },
    databaseConnectionError: (error) => {
        logger_1.default.error('Database connection error', { error: error.message });
        return new DataError('Veritabanı bağlantı hatası', 'DATABASE_ERROR', 503, { originalError: error.message });
    },
    cacheConnectionError: (error) => {
        logger_1.default.error('Cache connection error', { error: error.message });
        return new DataError('Önbellek bağlantı hatası', 'CACHE_ERROR', 503, { originalError: error.message });
    },
    dataImportError: (source, error) => {
        logger_1.default.error('Data import error', { source, error: error.message });
        return new DataError('Veri içe aktarma hatası', 'DATA_IMPORT_ERROR', 500, { source, originalError: error.message });
    },
    yokAtlasError: (error) => {
        logger_1.default.error('YÖK Atlas API error', { error: error.message });
        return new DataError('YÖK Atlas verilerine erişim hatası', 'YOK_ATLAS_ERROR', 503, { originalError: error.message });
    },
    fuzzyMatchingError: (searchTerm, error) => {
        logger_1.default.error('Fuzzy matching error', { searchTerm, error: error.message });
        return new DataError('Arama algoritması hatası', 'FUZZY_MATCHING_ERROR', 500, { searchTerm, originalError: error.message });
    },
    insufficientData: (dataType, requiredFields) => {
        logger_1.default.warn('Insufficient data for operation', { dataType, requiredFields });
        return new DataError('Yetersiz veri', 'INSUFFICIENT_DATA', 400, { dataType, requiredFields });
    }
};
// Generate suggestions for data errors
exports.generateDataSuggestions = {
    universityNotFound: (searchTerm) => {
        const commonSuggestions = [
            'Üniversite adını tam olarak yazın',
            'Kısaltma kullanmayı deneyin (örn: "İTÜ", "ODTÜ")',
            'Türkçe karakterleri kontrol edin (ç, ğ, ı, ö, ş, ü)',
            'Farklı yazım şekillerini deneyin'
        ];
        // Add specific suggestions based on search term
        if (searchTerm.length < 3) {
            commonSuggestions.unshift('En az 3 karakter girin');
        }
        if (searchTerm.includes('universitesi')) {
            commonSuggestions.unshift('Sadece üniversite adını yazın (örn: "Marmara" yerine "Marmara Üniversitesi")');
        }
        return commonSuggestions;
    },
    departmentNotFound: (searchTerm, universityName) => {
        const suggestions = [
            'Bölüm adını tam olarak yazın',
            'Farklı yazım şekillerini deneyin',
            'Fakülte adıyla birlikte belirtin'
        ];
        if (universityName) {
            suggestions.unshift(`${universityName} üniversitesinde bu bölümü kontrol edin`);
        }
        if (searchTerm.includes('mühendislik')) {
            suggestions.push('Mühendislik bölümleri için tam adı kullanın (örn: "Bilgisayar Mühendisliği")');
        }
        return suggestions;
    },
    scoreDataNotFound: (universityName, departmentName, year) => {
        const suggestions = [
            'Farklı bir yıl için sorgulayın',
            'Benzer bölümleri kontrol edin',
            'Bu bölümün farklı dil seçeneklerini deneyin'
        ];
        if (year && year < 2020) {
            suggestions.unshift('2020 ve sonrası yıllar için veri mevcuttur');
        }
        if (departmentName.includes('İngilizce')) {
            suggestions.push('Türkçe eğitim seçeneğini de kontrol edin');
        }
        return suggestions;
    }
};
// Fallback data for common queries
const generateDataFallback = (error) => {
    const fallbackData = {
        'UNIVERSITY_NOT_FOUND': {
            popularUniversities: [
                'İstanbul Üniversitesi',
                'Marmara Üniversitesi',
                'İstanbul Teknik Üniversitesi',
                'Boğaziçi Üniversitesi',
                'Orta Doğu Teknik Üniversitesi',
                'Ankara Üniversitesi',
                'Gazi Üniversitesi',
                'Hacettepe Üniversitesi'
            ],
            searchTips: exports.generateDataSuggestions.universityNotFound(error.details?.searchTerm || '')
        },
        'DEPARTMENT_NOT_FOUND': {
            popularDepartments: [
                'İşletme',
                'Bilgisayar Mühendisliği',
                'Elektrik-Elektronik Mühendisliği',
                'Makine Mühendisliği',
                'Hukuk',
                'Tıp',
                'Psikoloji',
                'İngilizce Öğretmenliği'
            ],
            searchTips: exports.generateDataSuggestions.departmentNotFound(error.details?.searchTerm || '', error.details?.universityName)
        },
        'SCORE_DATA_NOT_FOUND': {
            availableYears: [2020, 2021, 2022, 2023, 2024],
            alternativeQueries: [
                'Genel puan aralığı bilgisi',
                'Benzer bölümler',
                'Aynı üniversitedeki diğer bölümler'
            ],
            searchTips: exports.generateDataSuggestions.scoreDataNotFound(error.details?.universityName || '', error.details?.departmentName || '', error.details?.year)
        },
        'DATABASE_ERROR': {
            message: 'Veriler geçici olarak erişilemez durumda',
            retryAfter: 30,
            alternatives: [
                'Birkaç dakika sonra tekrar deneyin',
                'Genel bilgi için yardım alın',
                'Farklı bir soru sorun'
            ]
        },
        'YOK_ATLAS_ERROR': {
            message: 'YÖK Atlas verilerine şu anda erişilemiyor',
            lastUpdate: '2024 verileri mevcut',
            alternatives: [
                'Önbelleğe alınmış verilerle devam edebiliriz',
                'Genel puan aralıkları hakkında bilgi verebilirim',
                'Daha sonra tekrar deneyin'
            ]
        }
    };
    return fallbackData[error.code] || {
        message: 'Alternatif yollarla size yardımcı olmaya çalışabilirim',
        suggestions: [
            'Sorunuzu farklı şekilde sorun',
            'Daha genel bir soru sorun',
            'Yardım için "yardım" yazın'
        ]
    };
};
exports.generateDataFallback = generateDataFallback;
exports.default = exports.handleDataErrors;
//# sourceMappingURL=dataErrorHandler.js.map
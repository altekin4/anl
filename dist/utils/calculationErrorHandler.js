"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCalculationInput = exports.generateCalculationFallback = exports.generateCalculationSuggestions = exports.handleCalculationErrors = exports.CalculationError = void 0;
const errorHandler_1 = require("@/middleware/errorHandler");
const logger_1 = __importDefault(require("@/utils/logger"));
class CalculationError extends errorHandler_1.AppError {
    constructor(message, code, statusCode = 400, details) {
        super(message, statusCode, code, details);
    }
}
exports.CalculationError = CalculationError;
// Calculation-specific error handlers
exports.handleCalculationErrors = {
    invalidScoreInput: (score, field) => {
        logger_1.default.warn('Invalid score input', { score, field });
        return new CalculationError('Geçersiz puan değeri', 'INVALID_SCORE_INPUT', 400, { score, field, validRange: { min: 0, max: 500 } });
    },
    invalidNetInput: (net, examType) => {
        logger_1.default.warn('Invalid net input', { net, examType });
        const maxNets = {
            'TYT': 120,
            'AYT': 80,
            'YDT': 80
        };
        return new CalculationError('Geçersiz net değeri', 'INVALID_NET_INPUT', 400, { net, examType, validRange: { min: 0, max: maxNets[examType] || 120 } });
    },
    missingRequiredData: (missingFields) => {
        logger_1.default.warn('Missing required calculation data', { missingFields });
        return new CalculationError('Hesaplama için gerekli bilgiler eksik', 'MISSING_CALCULATION_DATA', 400, { missingFields });
    },
    calculationOverflow: (operation, values) => {
        logger_1.default.error('Calculation overflow', { operation, values });
        return new CalculationError('Hesaplama sınırları aşıldı', 'CALCULATION_OVERFLOW', 400, { operation, values });
    },
    noValidCombination: (targetScore, examType) => {
        logger_1.default.warn('No valid net combination found', { targetScore, examType });
        return new CalculationError('Bu puan için geçerli net kombinasyonu bulunamadı', 'NO_VALID_COMBINATION', 404, { targetScore, examType });
    },
    unrealisticTarget: (targetScore, maxPossible) => {
        logger_1.default.warn('Unrealistic target score', { targetScore, maxPossible });
        return new CalculationError('Hedef puan çok yüksek', 'UNREALISTIC_TARGET', 400, { targetScore, maxPossible });
    },
    insufficientHistoricalData: (year, examType) => {
        logger_1.default.warn('Insufficient historical data', { year, examType });
        return new CalculationError('Bu yıl için yeterli geçmiş veri yok', 'INSUFFICIENT_HISTORICAL_DATA', 404, { year, examType, availableYears: [2020, 2021, 2022, 2023, 2024] });
    },
    formulaError: (formula, error) => {
        logger_1.default.error('Formula calculation error', { formula, error: error.message });
        return new CalculationError('Hesaplama formülünde hata', 'FORMULA_ERROR', 500, { formula, originalError: error.message });
    },
    confidenceTooLow: (confidence, threshold = 0.3) => {
        logger_1.default.warn('Calculation confidence too low', { confidence, threshold });
        return new CalculationError('Hesaplama güvenilirliği düşük', 'LOW_CONFIDENCE', 200, // Still return data but with warning
        { confidence, threshold });
    }
};
// Generate calculation suggestions
exports.generateCalculationSuggestions = {
    invalidScoreInput: (score, field) => {
        const suggestions = [
            'Puan değeri 0-500 arasında olmalıdır',
            'Ondalık sayı kullanmayın',
            'Sadece sayı girin'
        ];
        if (score < 0) {
            suggestions.unshift('Negatif puan olamaz');
        }
        else if (score > 500) {
            suggestions.unshift('Maksimum puan 500\'dür');
        }
        return suggestions;
    },
    invalidNetInput: (net, examType) => {
        const maxNets = {
            'TYT': 120,
            'AYT': 80,
            'YDT': 80
        };
        const maxNet = maxNets[examType] || 120;
        const suggestions = [
            `${examType} için maksimum ${maxNet} net olabilir`,
            'Net değeri 0 ile maksimum arasında olmalıdır',
            'Ondalık sayı kullanabilirsiniz (örn: 45.5)'
        ];
        if (net < 0) {
            suggestions.unshift('Negatif net olamaz');
        }
        return suggestions;
    },
    noValidCombination: (targetScore, examType) => {
        return [
            'Hedef puanınızı düşürmeyi deneyin',
            'Farklı sınav türü seçin',
            'Daha gerçekçi bir hedef belirleyin',
            'Geçmiş yıl verilerini kontrol edin'
        ];
    },
    unrealisticTarget: (targetScore, maxPossible) => {
        return [
            `Maksimum ulaşılabilir puan yaklaşık ${maxPossible}`,
            'Daha gerçekçi bir hedef belirleyin',
            'Aşamalı hedefler koyun',
            'Mevcut durumunuzu değerlendirin'
        ];
    }
};
// Fallback calculations for errors
const generateCalculationFallback = (error) => {
    const fallbackData = {
        'INVALID_SCORE_INPUT': {
            validRanges: {
                TYT: { min: 100, max: 500 },
                AYT: { min: 100, max: 500 },
                YDT: { min: 100, max: 500 }
            },
            examples: [
                'TYT: 350 puan için hesaplama',
                'AYT SAY: 400 puan için hesaplama',
                'YDT: 300 puan için hesaplama'
            ]
        },
        'NO_VALID_COMBINATION': {
            alternativeTargets: [
                { score: Math.max(150, (error.details?.targetScore || 300) - 50), description: 'Daha ulaşılabilir hedef' },
                { score: Math.max(150, (error.details?.targetScore || 300) - 100), description: 'Güvenli hedef' },
                { score: Math.max(150, (error.details?.targetScore || 300) - 150), description: 'Başlangıç hedefi' }
            ],
            tips: [
                'Aşamalı hedefler belirleyin',
                'Güçlü olduğunuz derslere odaklanın',
                'Zayıf alanlarınızı geliştirin'
            ]
        },
        'UNREALISTIC_TARGET': {
            realisticTargets: [
                { score: 300, description: 'İyi bir başlangıç hedefi' },
                { score: 350, description: 'Orta seviye hedef' },
                { score: 400, description: 'Yüksek hedef' },
                { score: 450, description: 'Çok yüksek hedef (çok çalışma gerekir)' }
            ],
            studyPlan: [
                'Mevcut seviyenizi belirleyin',
                'Aylık hedefler koyun',
                'Düzenli deneme sınavları çözün',
                'Eksik konuları tamamlayın'
            ]
        },
        'INSUFFICIENT_HISTORICAL_DATA': {
            availableYears: [2020, 2021, 2022, 2023, 2024],
            generalRanges: {
                'Tıp': { min: 480, max: 500 },
                'Mühendislik': { min: 350, max: 450 },
                'İşletme': { min: 300, max: 400 },
                'Eğitim': { min: 250, max: 350 }
            },
            note: 'Genel puan aralıkları yaklaşık değerlerdir'
        },
        'LOW_CONFIDENCE': {
            warningMessage: 'Bu hesaplama düşük güvenilirlikte',
            reasons: [
                'Sınırlı veri mevcut',
                'Puan dalgalanmaları yüksek',
                'Yeni bölüm veya değişiklik var'
            ],
            recommendations: [
                'Sonuçları referans olarak kullanın',
                'Farklı kaynaklarla karşılaştırın',
                'Güvenlik payı ekleyin',
                'Güncel verileri takip edin'
            ]
        }
    };
    return fallbackData[error.code] || {
        message: 'Alternatif hesaplama yöntemleri deneyebiliriz',
        suggestions: [
            'Farklı parametrelerle tekrar deneyin',
            'Genel puan aralıkları hakkında bilgi alın',
            'Benzer bölümler için hesaplama yapın'
        ]
    };
};
exports.generateCalculationFallback = generateCalculationFallback;
// Validation helpers
exports.validateCalculationInput = {
    score: (score, examType) => {
        if (typeof score !== 'number' || isNaN(score)) {
            throw exports.handleCalculationErrors.invalidScoreInput(score, 'score');
        }
        if (score < 100 || score > 500) {
            throw exports.handleCalculationErrors.invalidScoreInput(score, 'score');
        }
    },
    net: (net, examType) => {
        if (typeof net !== 'number' || isNaN(net)) {
            throw exports.handleCalculationErrors.invalidNetInput(net, examType);
        }
        const maxNets = {
            'TYT': 120,
            'AYT': 80,
            'YDT': 80
        };
        const maxNet = maxNets[examType] || 120;
        if (net < 0 || net > maxNet) {
            throw exports.handleCalculationErrors.invalidNetInput(net, examType);
        }
    },
    examType: (examType) => {
        const validTypes = ['TYT', 'AYT', 'YDT', 'SAY', 'EA', 'SOZ', 'DIL'];
        if (!validTypes.includes(examType)) {
            throw new CalculationError('Geçersiz sınav türü', 'INVALID_EXAM_TYPE', 400, { examType, validTypes });
        }
    }
};
exports.default = exports.handleCalculationErrors;
//# sourceMappingURL=calculationErrorHandler.js.map
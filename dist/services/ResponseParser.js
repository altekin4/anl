"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseParser = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class ResponseParser {
    /**
     * Parse OpenAI response and extract structured information
     */
    static parseResponse(content, intent) {
        const parsed = {
            content: content.trim(),
            confidence: 0.8 // Default confidence
        };
        try {
            // Extract suggestions if present
            const suggestions = this.extractSuggestions(content);
            if (suggestions.length > 0) {
                parsed.suggestions = suggestions;
            }
            // Extract clarification questions if present
            const clarificationQuestions = this.extractClarificationQuestions(content);
            if (clarificationQuestions.length > 0) {
                parsed.clarificationQuestions = clarificationQuestions;
            }
            // Extract follow-up actions if present
            const followUpActions = this.extractFollowUpActions(content);
            if (followUpActions.length > 0) {
                parsed.followUpActions = followUpActions;
            }
            // Adjust confidence based on content quality
            parsed.confidence = this.calculateContentConfidence(content, intent);
            // Clean up the main content
            parsed.content = this.cleanContent(content);
        }
        catch (error) {
            logger_1.default.error('Error parsing OpenAI response', { error, content });
        }
        return parsed;
    }
    /**
     * Extract suggestion items from response
     */
    static extractSuggestions(content) {
        const suggestions = [];
        // Look for bullet points or numbered lists
        const suggestionPatterns = [
            /^[•\-*]\s*(.+)$/gm,
            /^\d+\.\s*(.+)$/gm,
            /^[►▶]\s*(.+)$/gm
        ];
        for (const pattern of suggestionPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const suggestion = match[1].trim();
                if (suggestion.length > 10 && !suggestions.includes(suggestion)) {
                    suggestions.push(suggestion);
                }
            }
        }
        // Look for "Öneriler:" or "Suggestions:" sections
        const sectionMatch = content.match(/(?:öneriler?|suggestions?):?\s*\n((?:[•\-*►▶].*\n?)+)/i);
        if (sectionMatch) {
            const sectionContent = sectionMatch[1];
            const items = sectionContent.match(/[•\-*►▶]\s*(.+)/g);
            if (items) {
                items.forEach(item => {
                    const cleaned = item.replace(/^[•\-*►▶]\s*/, '').trim();
                    if (cleaned.length > 10 && !suggestions.includes(cleaned)) {
                        suggestions.push(cleaned);
                    }
                });
            }
        }
        return suggestions.slice(0, 5); // Limit to 5 suggestions
    }
    /**
     * Extract clarification questions from response
     */
    static extractClarificationQuestions(content) {
        const questions = [];
        // Look for questions (sentences ending with ?)
        const questionMatches = content.match(/[^.!?]*\?/g);
        if (questionMatches) {
            questionMatches.forEach(question => {
                const cleaned = question.trim();
                if (cleaned.length > 10 && this.isValidQuestion(cleaned)) {
                    questions.push(cleaned);
                }
            });
        }
        return questions.slice(0, 3); // Limit to 3 questions
    }
    /**
     * Extract follow-up actions from response
     */
    static extractFollowUpActions(content) {
        const actions = [];
        // Look for action-oriented phrases
        const actionPatterns = [
            /(?:yapabilirsin|yapabilirsiniz|deneyebilirsin|deneyebilirsiniz|kontrol et|araştır|bak):?\s*(.+?)(?:\.|$)/gi,
            /(?:şunu|bunu|şöyle|böyle)\s+(?:yap|et|kontrol et|araştır):?\s*(.+?)(?:\.|$)/gi
        ];
        for (const pattern of actionPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const action = match[1].trim();
                if (action.length > 5 && !actions.includes(action)) {
                    actions.push(action);
                }
            }
        }
        return actions.slice(0, 3); // Limit to 3 actions
    }
    /**
     * Calculate confidence based on content quality
     */
    static calculateContentConfidence(content, intent) {
        let confidence = 0.5; // Base confidence
        // Check content length
        if (content.length > 100)
            confidence += 0.1;
        if (content.length > 300)
            confidence += 0.1;
        // Check for Turkish language indicators
        const turkishWords = ['için', 'olan', 'olan', 'ile', 'bu', 'şu', 've', 'veya', 'ama', 'fakat'];
        const turkishWordCount = turkishWords.filter(word => content.toLowerCase().includes(word)).length;
        confidence += Math.min(turkishWordCount * 0.02, 0.1);
        // Check for intent-specific keywords
        const intentKeywords = this.getIntentKeywords(intent);
        const keywordMatches = intentKeywords.filter(keyword => content.toLowerCase().includes(keyword.toLowerCase())).length;
        confidence += Math.min(keywordMatches * 0.05, 0.2);
        // Check for structured content (lists, numbers, etc.)
        if (content.includes('•') || content.includes('-') || /\d+\./.test(content)) {
            confidence += 0.1;
        }
        // Check for questions (indicates engagement)
        if (content.includes('?')) {
            confidence += 0.05;
        }
        return Math.min(confidence, 1.0);
    }
    /**
     * Get keywords for specific intents
     */
    static getIntentKeywords(intent) {
        const keywords = {
            net_calculation: ['net', 'soru', 'doğru', 'yanlış', 'hesaplama', 'puan'],
            base_score: ['taban', 'puan', 'geçen', 'yıl', 'minimum'],
            quota_inquiry: ['kontenjan', 'öğrenci', 'kişi', 'kapasite'],
            department_search: ['bölüm', 'program', 'fakülte', 'alan'],
            clarification_needed: ['hangi', 'nasıl', 'ne', 'kim', 'nerede']
        };
        return keywords[intent] || [];
    }
    /**
     * Check if a string is a valid question
     */
    static isValidQuestion(text) {
        const questionWords = ['ne', 'nasıl', 'neden', 'kim', 'hangi', 'kaç', 'nerede', 'ne zaman'];
        const lowerText = text.toLowerCase();
        return questionWords.some(word => lowerText.includes(word)) || text.includes('?');
    }
    /**
     * Clean and format the main content
     */
    static cleanContent(content) {
        let cleaned = content;
        // Remove excessive whitespace
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        cleaned = cleaned.replace(/\s{2,}/g, ' ');
        // Remove markdown-style formatting that might not render well
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
        cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Italic
        // Ensure proper sentence spacing
        cleaned = cleaned.replace(/([.!?])\s*([A-ZÇĞIÖŞÜ])/g, '$1 $2');
        // Remove any remaining bullet points from main content if they were extracted
        const lines = cleaned.split('\n');
        const filteredLines = lines.filter(line => {
            const trimmed = line.trim();
            return !(trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed));
        });
        return filteredLines.join('\n').trim();
    }
    /**
     * Validate parsed response
     */
    static validateResponse(parsed) {
        // Check if content is meaningful
        if (!parsed.content || parsed.content.length < 10) {
            return false;
        }
        // Check confidence level
        if (parsed.confidence < 0.3) {
            return false;
        }
        // Check for Turkish content (basic check)
        const turkishChars = /[çğıöşüÇĞIÖŞÜ]/;
        const hasTurkishChars = turkishChars.test(parsed.content);
        const hasTurkishWords = ['için', 'olan', 'ile', 'bu', 've'].some(word => parsed.content.toLowerCase().includes(word));
        return hasTurkishChars || hasTurkishWords;
    }
    /**
     * Format response for display
     */
    static formatForDisplay(parsed) {
        let formatted = parsed.content;
        // Add suggestions if present
        if (parsed.suggestions && parsed.suggestions.length > 0) {
            formatted += '\n\n**Öneriler:**\n';
            parsed.suggestions.forEach(suggestion => {
                formatted += `• ${suggestion}\n`;
            });
        }
        // Add clarification questions if present
        if (parsed.clarificationQuestions && parsed.clarificationQuestions.length > 0) {
            formatted += '\n\n**Ek sorular:**\n';
            parsed.clarificationQuestions.forEach(question => {
                formatted += `• ${question}\n`;
            });
        }
        // Add follow-up actions if present
        if (parsed.followUpActions && parsed.followUpActions.length > 0) {
            formatted += '\n\n**Yapabileceklerin:**\n';
            parsed.followUpActions.forEach(action => {
                formatted += `• ${action}\n`;
            });
        }
        return formatted.trim();
    }
}
exports.ResponseParser = ResponseParser;
//# sourceMappingURL=ResponseParser.js.map
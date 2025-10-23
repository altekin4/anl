"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FuzzyMatcher = void 0;
class FuzzyMatcher {
    /**
     * Find best matches for a query string against a list of items
     */
    static findMatches(query, items, getSearchFields, limit = 10) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        const normalizedQuery = this.normalizeText(query);
        const results = [];
        for (const item of items) {
            const searchFields = getSearchFields(item);
            let bestScore = 0;
            let bestField = '';
            for (const { field, value, isAlias } of searchFields) {
                if (!value)
                    continue;
                const normalizedValue = this.normalizeText(value);
                let score = this.calculateSimilarity(normalizedQuery, normalizedValue);
                // Apply bonuses
                if (score > 0) {
                    // Exact match bonus
                    if (normalizedQuery === normalizedValue) {
                        score += this.EXACT_MATCH_BONUS;
                    }
                    // Alias match bonus
                    if (isAlias) {
                        score += this.ALIAS_MATCH_BONUS;
                    }
                    // Substring match bonus
                    if (normalizedValue.includes(normalizedQuery) || normalizedQuery.includes(normalizedValue)) {
                        score += 0.1;
                    }
                    // Word boundary match bonus
                    if (this.hasWordBoundaryMatch(normalizedQuery, normalizedValue)) {
                        score += 0.15;
                    }
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestField = field;
                }
            }
            if (bestScore >= this.SIMILARITY_THRESHOLD) {
                results.push({
                    item,
                    score: bestScore,
                    matchedField: bestField,
                });
            }
        }
        // Sort by score (descending) and return top results
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    /**
     * Find single best match
     */
    static findBestMatch(query, items, getSearchFields) {
        const matches = this.findMatches(query, items, getSearchFields, 1);
        return matches.length > 0 ? matches[0] : null;
    }
    /**
     * Calculate similarity between two strings using multiple algorithms
     */
    static calculateSimilarity(str1, str2) {
        if (str1 === str2)
            return 1.0;
        if (str1.length === 0 || str2.length === 0)
            return 0.0;
        // Use multiple similarity algorithms and take the best score
        const levenshteinScore = this.levenshteinSimilarity(str1, str2);
        const jaccardScore = this.jaccardSimilarity(str1, str2);
        const longestCommonSubsequenceScore = this.lcsSimilarity(str1, str2);
        return Math.max(levenshteinScore, jaccardScore, longestCommonSubsequenceScore);
    }
    /**
     * Calculate Levenshtein similarity (normalized)
     */
    static levenshteinSimilarity(str1, str2) {
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        return maxLength === 0 ? 1.0 : 1.0 - (distance / maxLength);
    }
    /**
     * Calculate Levenshtein distance
     */
    static levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
    /**
     * Calculate Jaccard similarity using character n-grams
     */
    static jaccardSimilarity(str1, str2, n = 2) {
        const ngrams1 = this.getNgrams(str1, n);
        const ngrams2 = this.getNgrams(str2, n);
        const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
        const union = new Set([...ngrams1, ...ngrams2]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }
    /**
     * Calculate Longest Common Subsequence similarity
     */
    static lcsSimilarity(str1, str2) {
        const lcsLength = this.longestCommonSubsequence(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        return maxLength === 0 ? 1.0 : lcsLength / maxLength;
    }
    /**
     * Find longest common subsequence length
     */
    static longestCommonSubsequence(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                }
                else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        return dp[m][n];
    }
    /**
     * Generate n-grams from a string
     */
    static getNgrams(str, n) {
        const ngrams = new Set();
        const paddedStr = ' '.repeat(n - 1) + str + ' '.repeat(n - 1);
        for (let i = 0; i <= paddedStr.length - n; i++) {
            ngrams.add(paddedStr.substring(i, i + n));
        }
        return ngrams;
    }
    /**
     * Check if there's a word boundary match
     */
    static hasWordBoundaryMatch(query, text) {
        const queryWords = query.split(/\s+/);
        const textWords = text.split(/\s+/);
        return queryWords.some(queryWord => textWords.some(textWord => textWord.startsWith(queryWord) || queryWord.startsWith(textWord)));
    }
    /**
     * Normalize text for comparison
     */
    static normalizeText(text) {
        return text
            .toLowerCase()
            .trim()
            // Turkish character normalization
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            // Remove common words that don't add meaning
            .replace(/\b(üniversitesi|fakültesi|bölümü|mühendisliği)\b/g, '')
            .trim();
    }
    /**
     * Get similarity score between two strings (public method for testing)
     */
    static getSimilarityScore(str1, str2) {
        const normalized1 = this.normalizeText(str1);
        const normalized2 = this.normalizeText(str2);
        return this.calculateSimilarity(normalized1, normalized2);
    }
    /**
     * Check if two strings are considered a match
     */
    static isMatch(str1, str2, threshold) {
        const score = this.getSimilarityScore(str1, str2);
        return score >= (threshold || this.SIMILARITY_THRESHOLD);
    }
}
exports.FuzzyMatcher = FuzzyMatcher;
FuzzyMatcher.SIMILARITY_THRESHOLD = 0.6;
FuzzyMatcher.EXACT_MATCH_BONUS = 0.3;
FuzzyMatcher.ALIAS_MATCH_BONUS = 0.2;
//# sourceMappingURL=FuzzyMatcher.js.map
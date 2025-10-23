export interface MatchResult<T> {
    item: T;
    score: number;
    matchedField: string;
}
export declare class FuzzyMatcher {
    private static readonly SIMILARITY_THRESHOLD;
    private static readonly EXACT_MATCH_BONUS;
    private static readonly ALIAS_MATCH_BONUS;
    /**
     * Find best matches for a query string against a list of items
     */
    static findMatches<T>(query: string, items: T[], getSearchFields: (item: T) => {
        field: string;
        value: string;
        isAlias?: boolean;
    }[], limit?: number): MatchResult<T>[];
    /**
     * Find single best match
     */
    static findBestMatch<T>(query: string, items: T[], getSearchFields: (item: T) => {
        field: string;
        value: string;
        isAlias?: boolean;
    }[]): MatchResult<T> | null;
    /**
     * Calculate similarity between two strings using multiple algorithms
     */
    private static calculateSimilarity;
    /**
     * Calculate Levenshtein similarity (normalized)
     */
    private static levenshteinSimilarity;
    /**
     * Calculate Levenshtein distance
     */
    private static levenshteinDistance;
    /**
     * Calculate Jaccard similarity using character n-grams
     */
    private static jaccardSimilarity;
    /**
     * Calculate Longest Common Subsequence similarity
     */
    private static lcsSimilarity;
    /**
     * Find longest common subsequence length
     */
    private static longestCommonSubsequence;
    /**
     * Generate n-grams from a string
     */
    private static getNgrams;
    /**
     * Check if there's a word boundary match
     */
    private static hasWordBoundaryMatch;
    /**
     * Normalize text for comparison
     */
    private static normalizeText;
    /**
     * Get similarity score between two strings (public method for testing)
     */
    static getSimilarityScore(str1: string, str2: string): number;
    /**
     * Check if two strings are considered a match
     */
    static isMatch(str1: string, str2: string, threshold?: number): boolean;
}
//# sourceMappingURL=FuzzyMatcher.d.ts.map
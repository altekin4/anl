export interface EntityMatch {
    entity: string;
    value: string;
    confidence: number;
    startIndex: number;
    endIndex: number;
}
export declare class EntityExtractor {
    private readonly turkishCharMap;
    private readonly turkishAbbreviations;
    private readonly universityAliases;
    private readonly departmentAliases;
    /**
     * Extract entities from Turkish text with language-specific processing
     */
    extractEntities(text: string, entityTypes?: string[]): EntityMatch[];
    /**
     * Normalize Turkish text for better matching
     */
    normalizeText(text: string): string;
    /**
     * Convert Turkish characters to ASCII equivalents for fuzzy matching
     */
    toAscii(text: string): string;
    /**
     * Expand Turkish abbreviations
     */
    expandAbbreviations(text: string): string;
    /**
     * Extract specific entity type from text
     */
    private extractEntityType;
    /**
     * Extract university entities with Turkish language support
     */
    private extractUniversityEntities;
    /**
     * Extract department entities with Turkish language support
     */
    private extractDepartmentEntities;
    /**
     * Extract score type entities
     */
    private extractScoreTypeEntities;
    /**
     * Extract language entities
     */
    private extractLanguageEntities;
    /**
     * Extract numerical entities for TYT/AYT calculations
     */
    private extractNumberEntities;
    /**
     * Calculate similarity between two Turkish texts
     */
    calculateSimilarity(text1: string, text2: string): number;
    /**
     * Calculate Levenshtein similarity between two strings
     */
    private levenshteinSimilarity;
}
//# sourceMappingURL=EntityExtractor.d.ts.map
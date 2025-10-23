export interface PromptTemplate {
    system: string;
    user: string;
}
export declare class PromptTemplates {
    /**
     * Template for net calculation responses
     */
    static getNetCalculationTemplate(): PromptTemplate;
    /**
     * Template for base score inquiries
     */
    static getBaseScoreTemplate(): PromptTemplate;
    /**
     * Template for department search responses
     */
    static getDepartmentSearchTemplate(): PromptTemplate;
    /**
     * Template for clarification questions
     */
    static getClarificationTemplate(): PromptTemplate;
    /**
     * Template for quota inquiries
     */
    static getQuotaTemplate(): PromptTemplate;
    /**
     * Template for error handling
     */
    static getErrorTemplate(): PromptTemplate;
    /**
     * Template for general help
     */
    static getHelpTemplate(): PromptTemplate;
    /**
     * Template for greeting responses
     */
    static getGreetingTemplate(): PromptTemplate;
    /**
     * Fill template with provided data
     */
    static fillTemplate(template: string, data: Record<string, any>): string;
    /**
     * Get appropriate template based on intent
     */
    static getTemplateByIntent(intent: string): PromptTemplate;
}
//# sourceMappingURL=PromptTemplates.d.ts.map
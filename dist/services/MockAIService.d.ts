export interface AIResponse {
    content: string;
    intent: string;
    entities: Record<string, any>;
    suggestions?: string[];
}
export interface TYTCalculation {
    turkish: {
        correct: number;
        wrong: number;
        net: number;
    };
    math: {
        correct: number;
        wrong: number;
        net: number;
    };
    science: {
        correct: number;
        wrong: number;
        net: number;
    };
    social: {
        correct: number;
        wrong: number;
        net: number;
    };
    totalNet: number;
    score: number;
}
export interface AYTCalculation {
    math: {
        correct: number;
        wrong: number;
        net: number;
    };
    physics: {
        correct: number;
        wrong: number;
        net: number;
    };
    chemistry: {
        correct: number;
        wrong: number;
        net: number;
    };
    biology: {
        correct: number;
        wrong: number;
        net: number;
    };
    literature: {
        correct: number;
        wrong: number;
        net: number;
    };
    history: {
        correct: number;
        wrong: number;
        net: number;
    };
    geography: {
        correct: number;
        wrong: number;
        net: number;
    };
    philosophy: {
        correct: number;
        wrong: number;
        net: number;
    };
    religion: {
        correct: number;
        wrong: number;
        net: number;
    };
    totalNet: number;
    score: number;
}
export interface StudentAdvice {
    category: 'study_method' | 'time_management' | 'motivation' | 'exam_strategy' | 'subject_specific';
    title: string;
    content: string;
    author: string;
    success_story: string;
}
export declare class MockAIService {
    private dataService;
    private calculatorService;
    private intentClassifier;
    private entityExtractor;
    constructor();
    generateResponse(userMessage: string, sessionId?: string): Promise<AIResponse>;
    private handleNetCalculation;
    private handleBaseScoreInquiry;
    private handleDepartmentSearch;
    private handleUniversityInfo;
    private handleQuotaInquiry;
    private handleGreeting;
    private handleThanks;
    private handleGeneral;
    private handleTYTCalculation;
    private handleAYTCalculation;
    private handleStudyAdvice;
    private calculateTYT;
    private calculateAYT;
    private getTYTEvaluation;
    private getAYTEvaluation;
    private getTYTTargetSuggestions;
    private getAYTTargetSuggestions;
    private getStudentAdvices;
    private getMockNetCalculation;
    private getMockScoreData;
    private getMockDepartments;
    private getMockUniversityInfo;
    private getMockQuotaInfo;
}
//# sourceMappingURL=MockAIService.d.ts.map
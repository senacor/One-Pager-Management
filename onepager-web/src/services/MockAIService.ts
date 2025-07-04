/**
 * MockAIService
 *
 * A mock implementation of the AIService interface for development and testing.
 * This service provides realistic-looking AI suggestions without requiring
 * actual AI service integration.
 */

import type {
    AIService,
    SuggestionRequest,
    SuggestionResponse,
    ContextualDescriptionRequest,
    ContextualDescriptionResponse,
    NewEntrySuggestionsRequest,
    NewEntrySuggestionsResponse,
    OnePagerContext
} from './types';
import { AIServiceError } from './types';

// Define analysis result type
interface EntryAnalysis {
    hasMetrics: boolean;
    hasTechnical: boolean;
    hasManagement: boolean;
    hasConsulting: boolean;
    hasDomain: boolean;
    count: number;
    averageLength: number;
    keywords: string[];
}

export class MockAIService implements AIService {
    private readonly responseDelay: number;
    private readonly failureRate: number;

    constructor(options: { responseDelay?: number; failureRate?: number } = {}) {
        this.responseDelay = options.responseDelay ?? 800;
        this.failureRate = options.failureRate ?? 0; // 0 = never fail, 0.1 = 10% failure rate
    }

    async getSuggestion(request: SuggestionRequest): Promise<SuggestionResponse> {
        await this.simulateDelay();
        this.simulateFailure();

        if (!request.text.trim()) {
            return {
                suggestion: '',
                confidence: 0
            };
        }

        const suggestion = this.generateSuggestion(request);
        const confidence = this.calculateConfidence(request.text, suggestion);

        return {
            suggestion,
            confidence,
            reasoning: this.generateReasoning()
        };
    }

    async getContextualDescription(request: ContextualDescriptionRequest): Promise<ContextualDescriptionResponse> {
        await this.simulateDelay();
        this.simulateFailure();

        const filledEntries = request.entries.filter(entry => entry.trim().length > 0);

        if (filledEntries.length === 0) {
            return this.getEmptyStateDescription(request.context, request.baseDescription);
        }

        const analysis = this.analyzeEntries(filledEntries);
        const description = this.generateContextualDescription(analysis, request.context);
        const suggestions = this.generateContextualSuggestions(analysis, request.context);
        const completionScore = this.calculateCompletionScore(filledEntries, request.context);

        return {
            description,
            suggestions,
            completionScore
        };
    }

    async getNewEntrySuggestions(request: NewEntrySuggestionsRequest): Promise<NewEntrySuggestionsResponse> {
        await this.simulateDelay();
        this.simulateFailure();

        const maxSuggestions = request.maxSuggestions ?? 3;
        const suggestions = this.generateNewEntrySuggestions(request);
        const categories = this.categorizeNewEntrySuggestions(suggestions, request.context);

        return {
            suggestions: suggestions.slice(0, maxSuggestions),
            categories
        };
    }

    async isAvailable(): Promise<boolean> {
        return true; // Mock service is always available
    }

    getServiceInfo() {
        return {
            name: 'Mock AI Service',
            version: '1.0.0',
            type: 'mock' as const
        };
    }

    // Private helper methods

    private async simulateDelay(): Promise<void> {
        // Add some randomness to make it feel more realistic
        const delay = this.responseDelay + Math.random() * 400 - 200;
        await new Promise(resolve => setTimeout(resolve, Math.max(100, delay)));
    }

    private simulateFailure(): void {
        if (Math.random() < this.failureRate) {
            throw new AIServiceError('Mock service simulated failure', 'SIMULATED_FAILURE');
        }
    }

    private generateSuggestion(request: SuggestionRequest): string {
        const { text, context } = request;
        const lowerText = text.toLowerCase();

        // Context-specific suggestion templates
        const templates = this.getSuggestionTemplates(context);

        // Find matching templates based on keywords
        for (const [keywords, template] of Object.entries(templates)) {
            if (keywords.split('|').some(keyword => lowerText.includes(keyword.toLowerCase()))) {
                return template;
            }
        }

        // Generic enhancement based on context
        return this.generateGenericSuggestion(text, context);
    }

    private getSuggestionTemplates(context: OnePagerContext): Record<string, string> {
        const templates = {
            focusAreas: {
                'cloud|aws|azure|gcp': 'Cloud Architecture & DevOps with expertise in scalable infrastructure design',
                'react|javascript|frontend': 'Frontend Development with modern frameworks and user experience optimization',
                'java|backend|api': 'Backend Systems Architecture with microservices and API design',
                'management|leadership|team': 'Technical Leadership & Team Management with agile methodologies',
                'data|analytics|ml': 'Data Engineering & Analytics with machine learning implementation',
                'security|cybersecurity': 'Application Security & Compliance with industry best practices',
                'mobile|ios|android': 'Mobile Application Development with cross-platform solutions',
                'devops|ci|deployment': 'DevOps & Continuous Integration with automated deployment pipelines'
            },
            experience: {
                'project|led|managed': 'Led cross-functional team of 8 developers in delivering scalable solution that increased system efficiency by 40%',
                'development|developed|built': 'Architected and developed enterprise web application serving 50,000+ users daily with 99.9% uptime',
                'implementation|implemented|deployed': 'Successfully implemented cloud-native solution reducing infrastructure costs by 35% while improving performance',
                'optimization|improved|enhanced': 'Optimized application performance through code refactoring and database tuning, achieving 60% faster response times',
                'consulting|advised|guidance': 'Provided technical consulting to Fortune 500 clients, delivering strategic solutions worth $2M in business value',
                'mentoring|training|coaching': 'Mentored junior developers and conducted technical training sessions, improving team productivity by 25%'
            },
            projects: {
                'ecommerce|shopping|retail': 'E-commerce Platform Redesign: Led full-stack development of modern shopping platform with microservices architecture, resulting in 45% increase in conversion rates',
                'healthcare|medical|patient': 'Healthcare Management System: Developed HIPAA-compliant patient management platform with real-time analytics, serving 10,000+ patients',
                'finance|banking|fintech': 'Financial Analytics Dashboard: Built real-time trading analytics platform processing 1M+ transactions daily with sub-second latency',
                'mobile|app|ios|android': 'Cross-Platform Mobile App: Developed React Native application with offline capabilities, achieving 4.8-star rating and 100K+ downloads',
                'ml|ai|machine learning': 'AI-Powered Recommendation Engine: Implemented machine learning model that improved user engagement by 55% and reduced churn by 30%',
                'api|integration|microservices': 'API Gateway & Microservices: Designed scalable microservices architecture handling 500K+ API calls daily with 99.99% availability'
            }
        };

        return templates[context] || {};
    }

    private generateGenericSuggestion(text: string, context: OnePagerContext): string {
        const contextPrefixes = {
            focusAreas: 'Specialized in',
            experience: 'Successfully',
            projects: 'Project:'
        };

        const contextSuffixes = {
            focusAreas: 'with proven track record in delivering business value',
            experience: 'with measurable impact on business outcomes and team productivity',
            projects: 'delivering measurable results and exceeding stakeholder expectations'
        };

        return `${contextPrefixes[context]} ${text} ${contextSuffixes[context]}`;
    }

    private calculateConfidence(originalText: string, suggestion: string): number {
        // Simple confidence calculation based on enhancement
        const originalLength = originalText.trim().length;
        const suggestionLength = suggestion.trim().length;
        const hasMetrics = /\d+%|\d+\w|\$\d+|increased|improved|reduced|saved/i.test(suggestion);
        const hasSpecifics = suggestion.split(' ').length > originalText.split(' ').length + 3;

        let confidence = 0.7; // base confidence
        if (hasMetrics) confidence += 0.2;
        if (hasSpecifics) confidence += 0.1;
        if (suggestionLength > originalLength * 1.5) confidence += 0.1;

        return Math.min(0.95, confidence); // Cap at 95%
    }

    private generateReasoning(): string {
        const reasons = [
            'Enhanced with specific metrics and quantifiable outcomes',
            'Added industry-standard terminology and technical depth',
            'Included business impact and measurable results',
            'Expanded with relevant technical skills and methodologies',
            'Structured for better readability and professional impact'
        ];

        return reasons[Math.floor(Math.random() * reasons.length)];
    }

    private analyzeEntries(entries: string[]): EntryAnalysis {
        const analysis = {
            hasMetrics: false,
            hasTechnical: false,
            hasManagement: false,
            hasConsulting: false,
            hasDomain: false,
            count: entries.length,
            averageLength: entries.reduce((sum, entry) => sum + entry.length, 0) / entries.length,
            keywords: [] as string[]
        };

        const allText = entries.join(' ').toLowerCase();

        // Detect patterns
        analysis.hasMetrics = /\d+%|\d+\w|\$\d+|increased|improved|reduced|saved/i.test(allText);
        analysis.hasTechnical = /(development|programming|architecture|technical|code|system)/i.test(allText);
        analysis.hasManagement = /(manage|lead|team|leadership|strategy)/i.test(allText);
        analysis.hasConsulting = /(consult|advise|client|stakeholder)/i.test(allText);
        analysis.hasDomain = /(finance|healthcare|retail|automotive|education)/i.test(allText);

        // Extract key terms
        const commonWords = ['and', 'the', 'of', 'in', 'to', 'with', 'for', 'a', 'an', 'is', 'was', 'were'];
        analysis.keywords = allText
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.includes(word))
            .slice(0, 10);

        return analysis;
    }

    private generateContextualDescription(analysis: EntryAnalysis, context: OnePagerContext): string {
        const { hasMetrics, hasTechnical, hasManagement, hasConsulting, count } = analysis;

        if (count === 0) {
            return this.getEmptyStateDescription(context).description;
        }

        const suggestions = [];

        // Context-specific analysis
        if (context === 'focusAreas') {
            if (hasTechnical && hasManagement) {
                suggestions.push('Excellent balance of technical expertise and leadership skills - this combination is highly valued by employers');
                suggestions.push('Consider adding specific technologies or methodologies you specialize in');
            } else if (hasTechnical) {
                suggestions.push('Strong technical foundation - consider adding leadership or mentoring experiences to round out your profile');
            } else if (hasManagement) {
                suggestions.push('Great leadership focus - adding some technical depth would show your hands-on capabilities');
            }
        } else if (context === 'experience') {
            if (hasMetrics && hasManagement && hasTechnical) {
                suggestions.push('Outstanding profile with quantified achievements and diverse experience');
                suggestions.push('Consider organizing entries by impact or recency for maximum effect');
            } else if (!hasMetrics) {
                suggestions.push('Consider adding specific metrics and measurable outcomes to strengthen your entries');
            }
        } else if (context === 'projects') {
            if (hasConsulting) {
                suggestions.push('Consulting experience is valuable - ensure each project shows clear business impact');
            }
            if (count < 3) {
                suggestions.push('Consider adding more projects to showcase the breadth of your experience');
            }
        }

        // Generic suggestions based on entry quality
        if (analysis.averageLength < 50) {
            suggestions.push('Consider expanding entries with more specific details and outcomes');
        }

        if (suggestions.length === 0) {
            suggestions.push('Great work! Your entries show strong professional experience');
            suggestions.push('Continue to focus on specific achievements and measurable impact');
        }

        return `<ul>${suggestions.map(s => `<li>${s}</li>`).join('')}</ul>`;
    }

    private generateContextualSuggestions(analysis: EntryAnalysis, context: OnePagerContext): string[] {
        const suggestions = [];

        if (context === 'focusAreas' && analysis.count < 3) {
            suggestions.push('Add domain expertise (e.g., Healthcare, Finance, E-commerce)');
            suggestions.push('Include methodology expertise (e.g., Agile, DevOps, Design Thinking)');
        }

        if (context === 'experience' && !analysis.hasMetrics) {
            suggestions.push('Add quantified achievements with percentages or dollar amounts');
            suggestions.push('Include team sizes and project scales');
        }

        if (context === 'projects' && analysis.count < 2) {
            suggestions.push('Add recent projects that showcase different skills');
            suggestions.push('Include collaborative projects that show teamwork');
        }

        return suggestions;
    }

    private calculateCompletionScore(entries: string[], context: OnePagerContext): number {
        const count = entries.filter(e => e.trim().length > 0).length;
        const hasQualityContent = entries.some(e => e.length > 50);
        const hasMetrics = entries.some(e => /\d+%|\d+\w|\$\d+/i.test(e));

        let score = 0;

        // Base score from count
        const targetCounts = { focusAreas: 3, experience: 4, projects: 3 };
        const targetCount = targetCounts[context];
        score += Math.min(count / targetCount, 1) * 0.6;

        // Quality bonuses
        if (hasQualityContent) score += 0.2;
        if (hasMetrics) score += 0.2;

        return Math.min(score, 1);
    }

    private getEmptyStateDescription(context: OnePagerContext, baseDescription?: string): ContextualDescriptionResponse {
        const descriptions = {
            focusAreas: `<ul>
        <li>Focus areas help potential clients understand your expertise</li>
        <li>Include both technical skills and domain knowledge</li>
        <li>Consider current market trends and demands</li>
      </ul>`,
            experience: `<ul>
        <li>Experience entries should highlight your career progression and achievements</li>
        <li>Include both technical contributions and business impact</li>
        <li>Focus on measurable outcomes and specific technologies</li>
      </ul>`,
            projects: `<ul>
        <li>Showcase projects that demonstrate your key skills</li>
        <li>Include both independent and collaborative work</li>
        <li>Focus on business impact and technical challenges overcome</li>
      </ul>`
        };

        return {
            description: baseDescription || descriptions[context],
            completionScore: 0
        };
    }

    private generateNewEntrySuggestions(request: NewEntrySuggestionsRequest): string[] {
        const { existingEntries, context } = request;
        const analysis = this.analyzeEntries(existingEntries);

        const suggestionSets = {
            focusAreas: {
                technical: [
                    'Full-Stack Development with React and Node.js',
                    'Cloud Architecture & DevOps with AWS/Azure',
                    'Mobile Development with React Native',
                    'Data Engineering & Analytics',
                    'API Design & Microservices Architecture'
                ],
                leadership: [
                    'Technical Leadership & Team Management',
                    'Agile Project Management & Scrum Master',
                    'Stakeholder Management & Client Relations',
                    'Mentoring & Knowledge Transfer'
                ],
                domain: [
                    'Financial Services & FinTech Solutions',
                    'Healthcare Technology & HIPAA Compliance',
                    'E-commerce & Digital Marketing Platforms',
                    'Enterprise Software Integration'
                ]
            },
            experience: [
                'Led development team of 8 engineers in delivering enterprise platform that increased efficiency by 40%',
                'Architected microservices solution handling 1M+ daily transactions with 99.9% uptime',
                'Implemented CI/CD pipeline reducing deployment time from hours to minutes',
                'Managed $2M budget for digital transformation project exceeding ROI targets by 25%',
                'Mentored 12 junior developers through structured career development program'
            ],
            projects: [
                'E-commerce Platform Modernization: Migrated legacy system to cloud-native architecture, resulting in 50% performance improvement',
                'Real-time Analytics Dashboard: Built executive reporting system with live data visualization, enabling faster business decisions',
                'Mobile-First Customer Portal: Developed responsive web application with offline capabilities, increasing user engagement by 60%',
                'API Gateway Implementation: Designed scalable API infrastructure supporting 100K+ daily requests across multiple services',
                'Machine Learning Recommendation Engine: Built personalized content system that improved user retention by 35%'
            ]
        };

        // Select suggestions based on what's missing
        if (context === 'focusAreas') {
            const suggestions = [];
            if (!analysis.hasTechnical) suggestions.push(...suggestionSets.focusAreas.technical.slice(0, 2));
            if (!analysis.hasManagement) suggestions.push(...suggestionSets.focusAreas.leadership.slice(0, 2));
            if (!analysis.hasDomain) suggestions.push(...suggestionSets.focusAreas.domain.slice(0, 2));
            return suggestions.slice(0, 4);
        }

        return suggestionSets[context] || [];
    }

    private categorizeNewEntrySuggestions(suggestions: string[], context: OnePagerContext) {
        if (context === 'focusAreas') {
            return {
                'Technical Skills': suggestions.filter(s => /(development|architecture|engineering|api)/i.test(s)),
                'Leadership': suggestions.filter(s => /(leadership|management|mentoring|team)/i.test(s)),
                'Domain Expertise': suggestions.filter(s => /(financial|healthcare|ecommerce|enterprise)/i.test(s))
            };
        }

        return undefined;
    }
}

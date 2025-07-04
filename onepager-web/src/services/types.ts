/**
 * Service Layer Types
 *
 * This file defines the interfaces and types for the service layer abstraction.
 * These interfaces provide a clean contract between the UI components and the
 * underlying service implementations (mock or real AI services).
 */

// Context types for different sections of the OnePager
export type OnePagerContext = 'focusAreas' | 'experience' | 'projects';

// AI suggestion request for individual items
export interface SuggestionRequest {
    text: string;
    context: OnePagerContext;
    existingEntries?: string[];
    userProfile?: {
        position?: string;
        industry?: string;
    };
}

// AI suggestion response for individual items
export interface SuggestionResponse {
    suggestion: string;
    confidence: number; // 0-1 score indicating confidence in suggestion
    reasoning?: string; // Optional explanation of why this suggestion was made
}

// Contextual description request for providing guidance based on current entries
export interface ContextualDescriptionRequest {
    entries: string[];
    context: OnePagerContext;
    baseDescription?: string;
    userProfile?: {
        position?: string;
        industry?: string;
    };
}

// Contextual description response
export interface ContextualDescriptionResponse {
    description: string; // HTML description with guidance
    suggestions?: string[]; // Additional specific suggestions
    completionScore?: number; // 0-1 score indicating how complete this section is
}

// New entry suggestions request
export interface NewEntrySuggestionsRequest {
    existingEntries: string[];
    context: OnePagerContext;
    maxSuggestions?: number;
    userProfile?: {
        position?: string;
        industry?: string;
    };
}

// New entry suggestions response
export interface NewEntrySuggestionsResponse {
    suggestions: string[];
    categories?: {
        [category: string]: string[];
    };
}

// Base AI Service interface
export interface AIService {
    /**
     * Get an enhanced suggestion for an individual text entry
     */
    getSuggestion(request: SuggestionRequest): Promise<SuggestionResponse>;

    /**
     * Get contextual description and guidance based on current entries
     */
    getContextualDescription(request: ContextualDescriptionRequest): Promise<ContextualDescriptionResponse>;

    /**
     * Get suggestions for new entries based on existing content
     */
    getNewEntrySuggestions(request: NewEntrySuggestionsRequest): Promise<NewEntrySuggestionsResponse>;

    /**
     * Check if the service is available/configured
     */
    isAvailable(): Promise<boolean>;

    /**
     * Get service configuration info (for debugging/UI display)
     */
    getServiceInfo(): {
        name: string;
        version: string;
        type: 'mock' | 'openai' | 'azure' | 'custom';
    };
}

// Service provider configuration
export interface AIServiceConfig {
    type: 'mock' | 'openai' | 'azure' | 'custom';
    apiKey?: string;
    endpoint?: string;
    model?: string;
    timeout?: number;
    maxRetries?: number;
}

// Error types for service layer
export class AIServiceError extends Error {
    public readonly code: string;
    public readonly context?: unknown;

    constructor(
        message: string,
        code: string,
        context?: unknown
    ) {
        super(message);
        this.name = 'AIServiceError';
        this.code = code;
        this.context = context;
    }
}

export class AIServiceTimeoutError extends AIServiceError {
    constructor(timeout: number) {
        super(`AI service request timed out after ${timeout}ms`, 'TIMEOUT');
    }
}

export class AIServiceUnavailableError extends AIServiceError {
    constructor(service: string) {
        super(`AI service '${service}' is not available`, 'UNAVAILABLE');
    }
}

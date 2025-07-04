/**
 * AI Services
 *
 * Centralized export point for all AI service functionality.
 * This file provides a clean public API for the rest of the application.
 */

// Types
export type {
    AIService,
    AIServiceConfig,
    OnePagerContext,
    SuggestionRequest,
    SuggestionResponse,
    ContextualDescriptionRequest,
    ContextualDescriptionResponse,
    NewEntrySuggestionsRequest,
    NewEntrySuggestionsResponse
} from './types';

// Error classes
export {
    AIServiceError,
    AIServiceTimeoutError,
    AIServiceUnavailableError
} from './types';

// Service implementations
export { MockAIService } from './MockAIService';
export { OnePagerApiService, onePagerApiService } from './OnePagerApiService';
export type { Employee, OnePagerFile, OnePagerData } from './OnePagerApiService';

// Service provider
export { AIServiceProvider, aiServiceProvider, isAIServiceError } from './AIServiceProvider';

// Hooks
export {
    useAISuggestion,
    useContextualDescription,
    useNewEntrySuggestions,
    useAIServiceProvider,
    useAIForContext
} from './hooks';

// Import for internal use
import { aiServiceProvider } from './AIServiceProvider';

// Convenience function to initialize the service provider with mock service
export async function initializeMockAIService(options?: {
    responseDelay?: number;
    failureRate?: number;
}): Promise<void> {
    await aiServiceProvider.configure({
        type: 'mock',
        ...options
    });
}

// Convenience function to get service status
export function getAIServiceStatus() {
    return aiServiceProvider.getServiceInfo();
}

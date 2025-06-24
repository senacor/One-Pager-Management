/**
 * AI Service Hooks
 * 
 * React hooks that provide a clean interface for components to interact with
 * AI services. These hooks abstract away the service layer complexity and
 * provide consistent error handling and loading states.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { 
  OnePagerContext, 
  SuggestionResponse, 
  ContextualDescriptionResponse, 
  NewEntrySuggestionsResponse 
} from './types';
import { aiServiceProvider, isAIServiceError } from './AIServiceProvider';

// Hook for getting AI suggestions for individual items
export function useAISuggestion() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestion = useCallback(async (
    text: string,
    context: OnePagerContext,
    options?: {
      existingEntries?: string[];
      userProfile?: { position?: string; industry?: string };
    }
  ): Promise<SuggestionResponse | null> => {
    if (!text.trim()) return null;

    setIsLoading(true);
    setError(null);

    try {
      const service = aiServiceProvider.getService();
      const response = await service.getSuggestion({
        text,
        context,
        existingEntries: options?.existingEntries,
        userProfile: options?.userProfile
      });

      return response;
    } catch (err) {
      const errorMessage = isAIServiceError(err) 
        ? err.message 
        : 'Failed to get AI suggestion';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getSuggestion,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}

// Hook for getting contextual descriptions
export function useContextualDescription() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDescription = useCallback(async (
    entries: string[],
    context: OnePagerContext,
    options?: {
      baseDescription?: string;
      userProfile?: { position?: string; industry?: string };
    }
  ): Promise<ContextualDescriptionResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const service = aiServiceProvider.getService();
      const response = await service.getContextualDescription({
        entries,
        context,
        baseDescription: options?.baseDescription,
        userProfile: options?.userProfile
      });

      return response;
    } catch (err) {
      const errorMessage = isAIServiceError(err) 
        ? err.message 
        : 'Failed to get contextual description';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getDescription,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}

// Hook for getting new entry suggestions
export function useNewEntrySuggestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestions = useCallback(async (
    existingEntries: string[],
    context: OnePagerContext,
    options?: {
      maxSuggestions?: number;
      userProfile?: { position?: string; industry?: string };
    }
  ): Promise<NewEntrySuggestionsResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const service = aiServiceProvider.getService();
      const response = await service.getNewEntrySuggestions({
        existingEntries,
        context,
        maxSuggestions: options?.maxSuggestions,
        userProfile: options?.userProfile
      });

      return response;
    } catch (err) {
      const errorMessage = isAIServiceError(err) 
        ? err.message 
        : 'Failed to get new entry suggestions';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getSuggestions,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}

// Hook for service provider status and configuration
export function useAIServiceProvider() {
  const [serviceInfo, setServiceInfo] = useState(aiServiceProvider.getServiceInfo());

  const refreshServiceInfo = useCallback(() => {
    setServiceInfo(aiServiceProvider.getServiceInfo());
  }, []);

  const configure = useCallback(async (config: Parameters<typeof aiServiceProvider.configure>[0]) => {
    await aiServiceProvider.configure(config);
    refreshServiceInfo();
  }, [refreshServiceInfo]);

  const useMockService = useCallback(() => {
    aiServiceProvider.useMockService();
    refreshServiceInfo();
  }, [refreshServiceInfo]);

  const reset = useCallback(() => {
    aiServiceProvider.reset();
    refreshServiceInfo();
  }, [refreshServiceInfo]);

  // Refresh service info when component mounts
  useEffect(() => {
    refreshServiceInfo();
  }, [refreshServiceInfo]);

  return {
    serviceInfo,
    configure,
    useMockService,
    reset,
    refreshServiceInfo,
    isRealServiceAvailable: aiServiceProvider.isRealServiceAvailable()
  };
}

// Combined hook that provides all AI functionality for a specific context
export function useAIForContext(context: OnePagerContext) {
  const suggestion = useAISuggestion();
  const description = useContextualDescription();
  const newEntries = useNewEntrySuggestions();

  // Wrapper functions that automatically pass the context
  const getSuggestion = useCallback((
    text: string,
    options?: Parameters<typeof suggestion.getSuggestion>[2]
  ) => suggestion.getSuggestion(text, context, options), [suggestion.getSuggestion, context]);

  const getDescription = useCallback((
    entries: string[],
    options?: Parameters<typeof description.getDescription>[2]
  ) => description.getDescription(entries, context, options), [description.getDescription, context]);

  const getSuggestions = useCallback((
    existingEntries: string[],
    options?: Parameters<typeof newEntries.getSuggestions>[2]
  ) => newEntries.getSuggestions(existingEntries, context, options), [newEntries.getSuggestions, context]);

  return {
    // Individual functions
    getSuggestion,
    getDescription,
    getSuggestions,
    
    // Loading states
    isLoadingSuggestion: suggestion.isLoading,
    isLoadingDescription: description.isLoading,
    isLoadingSuggestions: newEntries.isLoading,
    isAnyLoading: suggestion.isLoading || description.isLoading || newEntries.isLoading,
    
    // Errors
    suggestionError: suggestion.error,
    descriptionError: description.error,
    suggestionsError: newEntries.error,
    hasAnyError: !!(suggestion.error || description.error || newEntries.error),
    
    // Error management
    clearAllErrors: () => {
      suggestion.clearError();
      description.clearError();
      newEntries.clearError();
    }
  };
}

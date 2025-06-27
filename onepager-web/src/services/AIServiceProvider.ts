/**
 * AIServiceProvider
 * 
 * A service provider that manages AI service instances and provides a unified
 * interface for the application to interact with AI services. This implements
 * the service provider pattern and handles service configuration, fallbacks,
 * and error handling.
 */

import type { AIService, AIServiceConfig } from './types';
import { MockAIService } from './MockAIService';
import { AIServiceError, AIServiceUnavailableError } from './types';

export class AIServiceProvider {
  private static instance: AIServiceProvider;
  private currentService: AIService | null = null;
  private config: AIServiceConfig | null = null;
  private fallbackService: AIService;

  private constructor() {
    // Initialize with mock service as fallback
    this.fallbackService = new MockAIService({
      responseDelay: 600,
      failureRate: 0
    });
  }

  /**
   * Get the singleton instance of the service provider
   */
  static getInstance(): AIServiceProvider {
    if (!AIServiceProvider.instance) {
      AIServiceProvider.instance = new AIServiceProvider();
    }
    return AIServiceProvider.instance;
  }

  /**
   * Configure the AI service provider
   */
  async configure(config: AIServiceConfig): Promise<void> {
    this.config = config;
    
    try {
      this.currentService = await this.createService(config);
      
      // Test the service availability
      const isAvailable = await this.currentService.isAvailable();
      if (!isAvailable) {
        console.warn('Configured AI service is not available, falling back to mock service');
        this.currentService = this.fallbackService;
      }
    } catch (error) {
      console.error('Failed to configure AI service:', error);
      this.currentService = this.fallbackService;
    }
  }

  /**
   * Get the current AI service instance
   */
  getService(): AIService {
    return this.currentService || this.fallbackService;
  }

  /**
   * Check if a real (non-mock) AI service is configured and available
   */
  isRealServiceAvailable(): boolean {
    if (!this.currentService) return false;
    const info = this.currentService.getServiceInfo();
    return info.type !== 'mock';
  }

  /**
   * Get current service information
   */
  getServiceInfo() {
    const service = this.getService();
    const info = service.getServiceInfo();
    
    return {
      ...info,
      isConfigured: this.config !== null,
      isFallback: service === this.fallbackService,
      config: this.config ? {
        type: this.config.type,
        endpoint: this.config.endpoint,
        model: this.config.model
      } : null
    };
  }

  /**
   * Force fallback to mock service (useful for development/testing)
   */
  useMockService(): void {
    this.currentService = this.fallbackService;
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.currentService = null;
    this.config = null;
  }

  /**
   * Create a service instance based on configuration
   */
  private async createService(config: AIServiceConfig): Promise<AIService> {
    switch (config.type) {
      case 'mock':
        return new MockAIService({
          responseDelay: 800,
          failureRate: 0.05 // 5% failure rate for testing
        });

      case 'openai':
        // TODO: Implement OpenAI service
        throw new AIServiceUnavailableError('OpenAI service not yet implemented');

      case 'azure':
        // TODO: Implement Azure OpenAI service
        throw new AIServiceUnavailableError('Azure OpenAI service not yet implemented');

      case 'custom':
        // TODO: Implement custom service
        throw new AIServiceUnavailableError('Custom service not yet implemented');

      default:
        throw new AIServiceError(`Unknown service type: ${config.type}`, 'UNKNOWN_SERVICE_TYPE');
    }
  }
}

// Export singleton instance for convenience
export const aiServiceProvider = AIServiceProvider.getInstance();

// Type guard helper
export function isAIServiceError(error: unknown): error is AIServiceError {
  return error instanceof AIServiceError;
}

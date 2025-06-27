/**
 * Configuration for OnePager API endpoints
 */

import { runtimeConfigManager } from './runtimeConfig';

export interface ApiConfig {
  baseUrl: string;
  functionsKey?: string;
}

export interface AppConfig {
  api: ApiConfig;
  environment: 'local' | 'production' | 'development';
}

// Default configuration based on environment
const createDefaultConfig = (): AppConfig => {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV;
  const mode = import.meta.env.MODE;
  
  // Get effective configuration (runtime takes precedence)
  const effectiveApiUrl = runtimeConfigManager.getApiBaseUrl();
  const effectiveFunctionsKey = runtimeConfigManager.getFunctionsKey();
  
  // Default to minimal local development setup
  const config: AppConfig = {
    api: {
      baseUrl: effectiveApiUrl || 'http://localhost:7071',
      functionsKey: effectiveFunctionsKey
    },
    environment: (import.meta.env.VITE_ENVIRONMENT as AppConfig["environment"]) || 'local'
  };

  console.log('🔧 API Configuration:', {
    environment: config.environment,
    baseUrl: config.api.baseUrl,
    hasFunctionsKey: !!config.api.functionsKey,
    functionsKeySource: effectiveFunctionsKey ? 
      (runtimeConfigManager.getConfig().functionsKey ? 'runtime (localStorage)' : 'build-time') : 'none',
    isDevelopment,
    mode,
    note: config.environment === 'production' && !config.api.functionsKey 
      ? 'Function key can be provided at runtime through debug panel' 
      : undefined
  });

  return config;
};

// Create configuration getter that respects runtime changes
export const getAppConfig = (): AppConfig => {
  return createDefaultConfig();
};

// Helper function to get API headers (with runtime config)
export const getApiHeaders = (): HeadersInit => {
  const config = getAppConfig();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (config.api.functionsKey) {
    headers['x-functions-key'] = config.api.functionsKey;
  }

  return headers;
};

// Helper function to build API URL (with runtime config)
export const buildApiUrl = (path: string): string => {
  const config = getAppConfig();
  const baseUrl = config.api.baseUrl.endsWith('/') ? config.api.baseUrl.slice(0, -1) : config.api.baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/api${cleanPath}`;
};

// Legacy exports for backward compatibility
export const appConfig = getAppConfig();

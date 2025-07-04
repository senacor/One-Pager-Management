/**
 * Runtime Configuration Manager
 *
 * Handles runtime configuration that can be set by users,
 * stored in localStorage, and managed through debug tools.
 */

export interface RuntimeConfig {
    functionsKey?: string;
    customApiUrl?: string;
}

export class RuntimeConfigManager {
    private static readonly STORAGE_KEY = 'onepager-runtime-config';
    private static instance: RuntimeConfigManager;
    private config: RuntimeConfig = {};
    private listeners: Array<(config: RuntimeConfig) => void> = [];

    private constructor() {
        this.loadFromStorage();
    }

    public static getInstance(): RuntimeConfigManager {
        if (!RuntimeConfigManager.instance) {
            RuntimeConfigManager.instance = new RuntimeConfigManager();
        }
        return RuntimeConfigManager.instance;
    }

    /**
     * Load configuration from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(RuntimeConfigManager.STORAGE_KEY);
            if (stored) {
                this.config = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load runtime config from localStorage:', error);
            this.config = {};
        }
    }

    /**
     * Save configuration to localStorage
     */
    private saveToStorage(): void {
        try {
            localStorage.setItem(RuntimeConfigManager.STORAGE_KEY, JSON.stringify(this.config));
            this.notifyListeners();
        } catch (error) {
            console.warn('Failed to save runtime config to localStorage:', error);
        }
    }

    /**
     * Get current runtime configuration
     */
    public getConfig(): RuntimeConfig {
        return { ...this.config };
    }

    /**
     * Set function key
     */
    public setFunctionsKey(key: string | undefined): void {
        if (key && key.trim()) {
            this.config.functionsKey = key.trim();
        } else {
            delete this.config.functionsKey;
        }
        this.saveToStorage();
    }

    /**
     * Set custom API URL (overrides environment variable)
     */
    public setCustomApiUrl(url: string | undefined): void {
        if (url && url.trim()) {
            this.config.customApiUrl = url.trim();
        } else {
            delete this.config.customApiUrl;
        }
        this.saveToStorage();
    }

    /**
     * Clear all runtime configuration
     */
    public clearConfig(): void {
        this.config = {};
        localStorage.removeItem(RuntimeConfigManager.STORAGE_KEY);
        this.notifyListeners();
    }

    /**
     * Check if function key is available (build-time or runtime)
     */
    public hasFunctionsKey(): boolean {
        return !!(import.meta.env.VITE_FUNCTIONS_KEY || this.config.functionsKey);
    }

    /**
     * Get effective function key (runtime takes precedence)
     */
    public getFunctionsKey(): string | undefined {
        return this.config.functionsKey || import.meta.env.VITE_FUNCTIONS_KEY;
    }

    /**
     * Get effective API base URL (runtime takes precedence)
     */
    public getApiBaseUrl(): string | undefined {
        return this.config.customApiUrl || import.meta.env.VITE_API_BASE_URL;
    }

    /**
     * Subscribe to configuration changes
     */
    public subscribe(listener: (config: RuntimeConfig) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners of configuration changes
     */
    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            try {
                listener(this.getConfig());
            } catch (error) {
                console.error('Error in runtime config listener:', error);
            }
        });
    }

    /**
     * Prompt user for function key if needed
     */
    public async promptForFunctionKeyIfNeeded(): Promise<string | undefined> {
        const existingKey = this.getFunctionsKey();
        if (existingKey) {
            return existingKey;
        }

        const userKey = prompt(
            'Function Key Required\n\n' +
            'This app needs an Azure Functions key to access the API.\n' +
            'You can get this from the Azure Portal under your Function App.\n\n' +
            'Enter your function key (or leave empty to skip):'
        );

        if (userKey && userKey.trim()) {
            this.setFunctionsKey(userKey.trim());
            return userKey.trim();
        }

        return undefined;
    }

    /**
     * Get debug information
     */
    public getDebugInfo(): Record<string, unknown> {
        return {
            runtimeConfig: this.getConfig(),
            effectiveApiUrl: this.getApiBaseUrl(),
            effectiveFunctionsKey: this.getFunctionsKey() ? '***' + this.getFunctionsKey()!.slice(-4) : undefined,
            hasFunctionsKey: this.hasFunctionsKey(),
            buildTimeConfig: {
                VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
                VITE_FUNCTIONS_KEY: import.meta.env.VITE_FUNCTIONS_KEY ? '***' + import.meta.env.VITE_FUNCTIONS_KEY.slice(-4) : undefined,
                VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT
            }
        };
    }
}

export const runtimeConfigManager = RuntimeConfigManager.getInstance();

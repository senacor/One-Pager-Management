/**
 * OnePager API Service
 * 
 * Service for communicating with the Azure Functions backend
 */

import { getAppConfig, buildApiUrl, getApiHeaders } from '../config/apiConfig';
import { runtimeConfigManager } from '../config/runtimeConfig';

export interface Employee {
  id: string;
  name: string;
  position: string;
}

export interface OnePagerFile {
  fileName: string;
  local: string;
}

export interface OnePagerData {
  photo: string;
}

export interface EmployeeSearchResult {
  result: Employee[];
}

export interface OnePagerFilesResult {
  result: OnePagerFile[];
}

export class OnePagerApiService {
  constructor() {
    // Config is now handled through getAppConfig() to support runtime changes
  }

  /**
   * Make a fetch request with proper headers
   */
  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Get fresh configuration and headers each time to respect runtime changes
    const headers = {
      ...getApiHeaders(),
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  /**
   * Check if authentication is available and prompt if needed
   */
  private async ensureAuthentication(): Promise<boolean> {
    const currentConfig = getAppConfig();
    
    // If we have a function key, we're good
    if (currentConfig.api.functionsKey) {
      return true;
    }

    // If we're in local development, it might be okay without a key
    if (currentConfig.environment === 'local') {
      return true;
    }

    // For production, try to get a key from the user
    const key = await runtimeConfigManager.promptForFunctionKeyIfNeeded();
    return !!key;
  }

  /**
   * Search for employees by name
   */
  async searchEmployees(name: string): Promise<Employee[]> {
    if (name.length < 3) {
      throw new Error('Search name must be at least 3 characters long');
    }

    // Ensure we have authentication if needed
    await this.ensureAuthentication();

    const url = buildApiUrl(`/employee?name=${encodeURIComponent(name)}`);
    const response = await this.makeRequest(url);
    
    if (!response.ok) {
      throw new Error(`Failed to search employees: ${response.status} ${response.statusText}`);
    }

    const data: EmployeeSearchResult = await response.json();
    return data.result;
  }

  /**
   * Get all OnePager files for a specific employee
   */
  async getEmployeeOnePagers(employeeId: string): Promise<OnePagerFile[]> {
    // Ensure we have authentication if needed
    await this.ensureAuthentication();

    const url = buildApiUrl(`/employee/${encodeURIComponent(employeeId)}/onepager`);
    const response = await this.makeRequest(url);
    
    if (!response.ok) {
      throw new Error(`Failed to get OnePagers: ${response.status} ${response.statusText}`);
    }

    const data: OnePagerFilesResult = await response.json();
    return data.result;
  }

  /**
   * Get OnePager data (currently just photo URL)
   */
  async getOnePagerData(employeeId: string, fileName: string): Promise<OnePagerData> {
    // Ensure we have authentication if needed
    await this.ensureAuthentication();

    const url = buildApiUrl(`/employee/${encodeURIComponent(employeeId)}/onepager/${encodeURIComponent(fileName)}`);
    const response = await this.makeRequest(url);
    
    if (!response.ok) {
      throw new Error(`Failed to get OnePager data: ${response.status} ${response.statusText}`);
    }

    const data: OnePagerData = await response.json();
    return data;
  }

  /**
   * Download OnePager file
   */
  async downloadOnePager(employeeId: string, fileName: string): Promise<Blob> {
    // Ensure we have authentication if needed
    await this.ensureAuthentication();

    const url = buildApiUrl(`/employee/${encodeURIComponent(employeeId)}/onepager/${encodeURIComponent(fileName)}/download`);
    const response = await this.makeRequest(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download OnePager: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }
}
// Export a default instance using the app configuration
export const onePagerApiService = new OnePagerApiService();

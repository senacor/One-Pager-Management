import { OnePagerApiService } from '../services/OnePagerApiService';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('OnePagerApiService', () => {
  let apiService: OnePagerApiService;

  beforeEach(() => {
    apiService = new OnePagerApiService('http://test-api');
    mockFetch.mockClear();
  });

  describe('searchEmployees', () => {
    it('should throw error for short search terms', async () => {
      await expect(apiService.searchEmployees('ab')).rejects.toThrow(
        'Search name must be at least 3 characters long'
      );
    });

    it('should make correct API call for employee search', async () => {
      const mockResponse = {
        result: [
          { id: '123', name: 'John Doe', position: 'Senior Consultant' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiService.searchEmployees('John');

      expect(mockFetch).toHaveBeenCalledWith('http://test-api/api/employee?name=John');
      expect(result).toEqual(mockResponse.result);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(apiService.searchEmployees('John')).rejects.toThrow(
        'Failed to search employees: 500 Internal Server Error'
      );
    });
  });

  describe('getEmployeeOnePagers', () => {
    it('should make correct API call for employee OnePagers', async () => {
      const mockResponse = {
        result: [
          { fileName: 'onepager.pptx', local: '/path/to/file' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiService.getEmployeeOnePagers('123');

      expect(mockFetch).toHaveBeenCalledWith('http://test-api/api/employee/123/onepager');
      expect(result).toEqual(mockResponse.result);
    });
  });

  describe('getOnePagerData', () => {
    it('should make correct API call for OnePager data', async () => {
      const mockResponse = {
        photo: 'http://test-api/api/employee/123/onepager/file.pptx/photo/image.jpg'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiService.getOnePagerData('123', 'file.pptx');

      expect(mockFetch).toHaveBeenCalledWith('http://test-api/api/employee/123/onepager/file.pptx');
      expect(result).toEqual(mockResponse);
    });
  });
});

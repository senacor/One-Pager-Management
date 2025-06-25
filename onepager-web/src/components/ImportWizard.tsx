import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Employee, OnePagerFile } from '../services/OnePagerApiService';
import { onePagerApiService } from '../services/OnePagerApiService';
import { useOnePagerContext } from '../hooks/useOnePager';
import { type PositionType, type PhotoData } from '../types/onepager';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportWizard({ isOpen, onClose }: ImportWizardProps) {
  const { t } = useTranslation();
  const { updateBasicInfo } = useOnePagerContext();
  
  const [currentStep, setCurrentStep] = useState<'search' | 'select' | 'preview'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [onePagerFiles, setOnePagerFiles] = useState<OnePagerFile[]>([]);
  const [selectedOnePager, setSelectedOnePager] = useState<OnePagerFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  
  // Ref for debounce timeout
  const searchTimeoutRef = useRef<number | null>(null);

  // Auto-search with debouncing
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Clear results if query is too short
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setError(null);
      return;
    }

    // Set new timeout for search
    searchTimeoutRef.current = window.setTimeout(async () => {
      if (searchQuery.length < 3) {
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const results = await onePagerApiService.searchEmployees(searchQuery);
        setSearchResults(results);
        if (results.length === 0) {
          setError(t('import.noEmployeesFound'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('import.searchError'));
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, t]); // Include t in dependencies

  const handleSelectEmployee = useCallback(async (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsLoading(true);
    setError(null);
    try {
      const files = await onePagerApiService.getEmployeeOnePagers(employee.id);
      setOnePagerFiles(files);
      if (files.length === 0) {
        setError(t('import.noOnePagersFound'));
      } else {
        setCurrentStep('select');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.loadOnePagersError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const handleSelectOnePager = useCallback(async (file: OnePagerFile) => {
    if (!selectedEmployee) return;
    
    setSelectedOnePager(file);
    setIsLoading(true);
    setError(null);
    try {
      const data = await onePagerApiService.getOnePagerData(selectedEmployee.id, file.fileName);
      
      // Download the actual image to convert it to a blob URL
      const imageResponse = await fetch(data.photo);
      if (!imageResponse.ok) {
        throw new Error(`Failed to load image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      
      const imageBlob = await imageResponse.blob();
      const blobUrl = URL.createObjectURL(imageBlob);
      setPhotoUrl(blobUrl);
      setCurrentStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.loadDataError'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmployee, t]);

  const handleImport = useCallback(() => {
    if (!selectedEmployee || !photoUrl) return;

    // Map position from string to PositionType (simple mapping for now)
    const mappedPosition = selectedEmployee.position || '';

    // Create proper PhotoData for imported photo
    const photoData: PhotoData = {
      originalFile: photoUrl, // Store the blob URL as originalFile
      croppedImageUrl: photoUrl, // Also as croppedImageUrl for display
      cropMetadata: {
        x: 0,
        y: 0,
        width: 300,
        height: 300
      }
    };

    // Update basic info with employee data
    updateBasicInfo({
      fullName: selectedEmployee.name,
      position: mappedPosition as PositionType,
      profilePhoto: photoData
    });

    // Close the wizard
    onClose();
  }, [selectedEmployee, photoUrl, updateBasicInfo, onClose]);

  const handleBack = useCallback(() => {
    if (currentStep === 'select') {
      setCurrentStep('search');
      setSelectedEmployee(null);
      setOnePagerFiles([]);
    } else if (currentStep === 'preview') {
      setCurrentStep('select');
      setSelectedOnePager(null);
      setPhotoUrl(null);
    }
  }, [currentStep]);

  const handleClose = useCallback(() => {
    // Reset all state
    setCurrentStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedEmployee(null);
    setOnePagerFiles([]);
    setSelectedOnePager(null);
    setError(null);
    setPhotoUrl(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {t('import.title')}
            </h2>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Search Employees */}
          {currentStep === 'search' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('import.searchEmployees')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('import.employeeName')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('import.searchPlaceholder')}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    {isLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    {searchQuery.length > 0 && searchQuery.length < 3 && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
                        {3 - searchQuery.length} more...
                      </div>
                    )}
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{t('import.searchResults')}</h4>
                    <div className="space-y-2 max-h-60 overflow-auto">
                      {searchResults.map((employee) => (
                        <div
                          key={employee.id}
                          className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleSelectEmployee(employee)}
                        >
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-gray-600">{employee.position}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Select OnePager */}
          {currentStep === 'select' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={handleBack}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← {t('import.back')}
                </button>
              </div>
              <h3 className="text-lg font-semibold mb-4">
                {t('import.selectOnePager')} - {selectedEmployee?.name}
              </h3>
              
              {onePagerFiles.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {onePagerFiles.map((file) => (
                    <div
                      key={file.fileName}
                      className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleSelectOnePager(file)}
                    >
                      <div className="font-medium">{file.fileName}</div>
                      <div className="text-sm text-gray-600">{file.local}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {currentStep === 'preview' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={handleBack}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← {t('import.back')}
                </button>
              </div>
              <h3 className="text-lg font-semibold mb-4">{t('import.preview')}</h3>
              
              {selectedEmployee && selectedOnePager && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium mb-2">{t('import.employeeInfo')}</h4>
                    <p><strong>{t('import.name')}:</strong> {selectedEmployee.name}</p>
                    <p><strong>{t('import.position')}:</strong> {selectedEmployee.position}</p>
                    <p><strong>{t('import.fileName')}:</strong> {selectedOnePager.fileName}</p>
                  </div>

                  {photoUrl && (
                    <div>
                      <h4 className="font-medium mb-2">{t('import.photo')}</h4>
                      <img
                        src={photoUrl}
                        alt={t('import.employeePhoto')}
                        className="w-32 h-32 object-cover rounded-lg border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="bg-yellow-50 p-4 rounded-md">
                    <p className="text-yellow-800">
                      {t('import.importNote')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('import.cancel')}
            </button>
            {currentStep === 'preview' && (
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {t('import.importButton')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

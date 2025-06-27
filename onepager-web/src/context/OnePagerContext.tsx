import React, { useReducer, useEffect, useCallback } from 'react';
import type { OnePagerData, BasicInfo } from '../types/onepager';
import { OnePagerContext, type OnePagerContextType } from './context';
import { onePagerReducer, createInitialState } from '../store/onePagerReducer';
import { validateStep, validateAllSteps, isStepComplete } from '../utils/validation';
import { saveToStorage, loadFromStorage, clearStorage, exportData, importData } from '../utils/storage';

// Provider component props
interface OnePagerProviderProps {
  children: React.ReactNode;
  autoSave?: boolean;
  autoLoad?: boolean;
}

// Provider component
export const OnePagerProvider: React.FC<OnePagerProviderProps> = ({ 
  children, 
  autoSave = true, 
  autoLoad = true 
}) => {
  const [state, dispatch] = useReducer(onePagerReducer, createInitialState());
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = React.useState(false);

  // Load data on mount if autoLoad is enabled
  useEffect(() => {
    if (autoLoad) {
      console.log('🔄 OnePagerProvider: Starting autoLoad...');
      setIsLoading(true);
      const savedData = loadFromStorage();
      if (savedData) {
        console.log('🔄 OnePagerProvider: Loading saved data:', { 
          fullName: savedData.basicInfo.fullName,
          focusAreas: savedData.focusAreas.length 
        });
        dispatch({ type: 'LOAD_DATA', payload: savedData });
      } else {
        console.log('🔄 OnePagerProvider: No saved data found');
      }
      setIsLoading(false);
      setHasLoadedInitialData(true);
    } else {
      setHasLoadedInitialData(true);
    }
  }, [autoLoad]);

  // Auto-save whenever data changes if autoSave is enabled (but not during initial load)
  useEffect(() => {
    if (autoSave && !isLoading && hasLoadedInitialData) {
      console.log('💾 Auto-saving data...', { fullName: state.basicInfo.fullName });
      saveToStorage(state);
    }
  }, [state, autoSave, isLoading, hasLoadedInitialData]);

  // Update basic info
  const updateBasicInfo = useCallback((info: Partial<BasicInfo>) => {
    dispatch({ type: 'UPDATE_BASIC_INFO', payload: info });
    
    // Validate and update step completion
    const updatedData = { ...state, basicInfo: { ...state.basicInfo, ...info } };
    const isComplete = isStepComplete(updatedData, 'basicInfo');
    dispatch({ type: 'SET_STEP_COMPLETION', payload: { step: 'basicInfo', isComplete } });
  }, [state]);

  // Update focus areas
  const updateFocusAreas = useCallback((areas: string[]) => {
    dispatch({ type: 'UPDATE_FOCUS_AREAS', payload: areas });
    
    // Validate and update step completion
    const updatedData = { ...state, focusAreas: areas };
    const isComplete = isStepComplete(updatedData, 'focusAreas');
    dispatch({ type: 'SET_STEP_COMPLETION', payload: { step: 'focus', isComplete } });
  }, [state]);

  // Update experience
  const updateExperience = useCallback((experience: string[]) => {
    dispatch({ type: 'UPDATE_EXPERIENCE', payload: experience });
    
    // Validate and update step completion
    const updatedData = { ...state, experience };
    const isComplete = isStepComplete(updatedData, 'experience');
    dispatch({ type: 'SET_STEP_COMPLETION', payload: { step: 'experience', isComplete } });
  }, [state]);

  // Update projects
  const updateProjects = useCallback((projects: string[]) => {
    dispatch({ type: 'UPDATE_PROJECTS', payload: projects });
    
    // Validate and update step completion
    const updatedData = { ...state, projects };
    const isComplete = isStepComplete(updatedData, 'projects');
    dispatch({ type: 'SET_STEP_COMPLETION', payload: { step: 'projects', isComplete } });
  }, [state]);

  // Validate step
  const validateStepAsync = useCallback(async (step: keyof OnePagerData['metadata']['stepCompletionStatus']): Promise<boolean> => {
    let stepName: string;
    switch (step) {
      case 'basicInfo':
        stepName = 'basicInfo';
        break;
      case 'focus':
        stepName = 'focusAreas';
        break;
      case 'experience':
        stepName = 'experience';
        break;
      case 'projects':
        stepName = 'projects';
        break;
      default:
        return false;
    }

    const { errors, isValid } = validateStep(state, stepName as keyof typeof import('../types/onepager').VALIDATION_RULES);
    
    // Update validation errors
    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: { field: stepName, errors } });
    
    // Update step completion status
    dispatch({ type: 'SET_STEP_COMPLETION', payload: { step, isComplete: isValid } });
    
    return isValid;
  }, [state]);

  // Export data
  const exportDataCallback = useCallback((): string => {
    return exportData(state);
  }, [state]);

  // Import data
  const importDataCallback = useCallback(async (jsonString: string): Promise<boolean> => {
    const importedData = importData(jsonString);
    if (importedData) {
      dispatch({ type: 'LOAD_DATA', payload: importedData });
      
      // Validate all steps after import
      const allErrors = validateAllSteps(importedData);
      Object.entries(allErrors).forEach(([field, errors]) => {
        dispatch({ type: 'SET_VALIDATION_ERRORS', payload: { field, errors } });
      });
      
      return true;
    }
    return false;
  }, []);

  // Reset data
  const resetData = useCallback(() => {
    dispatch({ type: 'RESET_DATA' });
  }, []);

  // Manual save to storage
  const saveToStorageCallback = useCallback(() => {
    saveToStorage(state);
  }, [state]);

  // Manual load from storage
  const loadFromStorageCallback = useCallback(() => {
    const savedData = loadFromStorage();
    if (savedData) {
      dispatch({ type: 'LOAD_DATA', payload: savedData });
    }
  }, []);

  // Clear storage
  const clearStorageCallback = useCallback(() => {
    clearStorage();
    dispatch({ type: 'RESET_DATA' });
  }, []);

  const contextValue: OnePagerContextType = {
    data: state,
    updateBasicInfo,
    updateFocusAreas,
    updateExperience,
    updateProjects,
    validateStep: validateStepAsync,
    exportData: exportDataCallback,
    importData: importDataCallback,
    resetData,
    saveToStorage: saveToStorageCallback,
    loadFromStorage: loadFromStorageCallback,
    clearStorage: clearStorageCallback,
    isLoading,
  };

  return (
    <OnePagerContext.Provider value={contextValue}>
      {children}
    </OnePagerContext.Provider>
  );
};

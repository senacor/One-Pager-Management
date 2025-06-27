import { useContext } from 'react';
import { OnePagerContext, type OnePagerContextType } from '../context/context';

// Main context hook
export const useOnePagerContext = (): OnePagerContextType => {
  const context = useContext(OnePagerContext);
  if (!context) {
    throw new Error('useOnePagerContext must be used within OnePagerProvider');
  }
  return context;
};

// Specialized hooks for specific data sections
export const useOnePagerData = () => {
  const { data } = useOnePagerContext();
  return data;
};

export const useBasicInfo = () => {
  const { data, updateBasicInfo, validateStep } = useOnePagerContext();
  return {
    basicInfo: data.basicInfo,
    updateBasicInfo,
    isValid: data.validation.errors.basicInfo?.length === 0,
    errors: data.validation.errors.basicInfo || [],
    isStepComplete: data.metadata.stepCompletionStatus.basicInfo,
    validateStep: () => validateStep('basicInfo'),
  };
};

export const useFocusAreas = () => {
  const { data, updateFocusAreas, validateStep } = useOnePagerContext();
  return {
    focusAreas: data.focusAreas,
    updateFocusAreas,
    isValid: data.validation.errors.focusAreas?.length === 0,
    errors: data.validation.errors.focusAreas || [],
    isStepComplete: data.metadata.stepCompletionStatus.focus,
    validateStep: () => validateStep('focus'),
  };
};

export const useExperience = () => {
  const { data, updateExperience, validateStep } = useOnePagerContext();
  return {
    experience: data.experience,
    updateExperience,
    isValid: data.validation.errors.experience?.length === 0,
    errors: data.validation.errors.experience || [],
    isStepComplete: data.metadata.stepCompletionStatus.experience,
    validateStep: () => validateStep('experience'),
  };
};

export const useProjects = () => {
  const { data, updateProjects, validateStep } = useOnePagerContext();
  return {
    projects: data.projects,
    updateProjects,
    isValid: data.validation.errors.projects?.length === 0,
    errors: data.validation.errors.projects || [],
    isStepComplete: data.metadata.stepCompletionStatus.projects,
    validateStep: () => validateStep('projects'),
  };
};

export const useFormCompletion = () => {
  const { data } = useOnePagerContext();
  const totalSteps = Object.keys(data.metadata.stepCompletionStatus).length;
  const completedSteps = Object.values(data.metadata.stepCompletionStatus).filter(Boolean).length;
  
  return {
    isComplete: data.metadata.isComplete,
    completedSteps,
    totalSteps,
    completionPercentage: Math.round((completedSteps / totalSteps) * 100),
    stepCompletionStatus: data.metadata.stepCompletionStatus,
  };
};

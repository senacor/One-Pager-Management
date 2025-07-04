import { createContext } from 'react';
import type { OnePagerData, BasicInfo } from '../types/onepager';

// Context interface
export interface OnePagerContextType {
    data: OnePagerData;
    updateBasicInfo: (info: Partial<BasicInfo>) => void;
    updateFocusAreas: (areas: string[]) => void;
    updateExperience: (experience: string[]) => void;
    updateProjects: (projects: string[]) => void;
    validateStep: (step: keyof OnePagerData['metadata']['stepCompletionStatus']) => Promise<boolean>;
    exportData: () => string;
    importData: (jsonString: string) => Promise<boolean>;
    resetData: () => void;
    saveToStorage: () => void;
    loadFromStorage: () => void;
    clearStorage: () => void;
    isLoading: boolean;
}

// Create context
export const OnePagerContext = createContext<OnePagerContextType | undefined>(undefined);

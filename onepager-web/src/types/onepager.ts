// Types and interfaces for OnePager data management

// Position constants based on company hierarchy
export const Position = {
  // Junior Level
  JUNIOR_CONSULTANT: 'Consultant',
  JUNIOR_DEVELOPER: 'Developer',
  
  // Senior Level
  SENIOR_CONSULTANT: 'Senior Consultant',
  SENIOR_DEVELOPER: 'Senior Developer',
  
  // Leads and Experts Level
  MANAGING_CONSULTANT: 'Managing Consultant',
  DELIVERY_MANAGER: 'Delivery Manager',
  ARCHITECT: 'Architect',
  LEAD_DEVELOPER: 'Lead Developer',
  TECHNICAL_EXPERT: 'Technical Expert'
} as const;

export type PositionType = typeof Position[keyof typeof Position];

export interface BasicInfo {
  fullName: string;
  position: PositionType | '';
  profilePhoto?: File | string;
}

export interface StepCompletionStatus {
  basicInfo: boolean;
  focus: boolean;
  experience: boolean;
  projects: boolean;
}

export interface ValidationState {
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  isValid: boolean;
}

export interface OnePagerMetadata {
  lastUpdated: Date;
  version: string;
  isComplete: boolean;
  stepCompletionStatus: StepCompletionStatus;
}

export interface OnePagerData {
  basicInfo: BasicInfo;
  focusAreas: string[];
  experience: string[];
  projects: string[];
  metadata: OnePagerMetadata;
  validation: ValidationState;
}

// Action types for the reducer
export type OnePagerActionType =
  | 'UPDATE_BASIC_INFO'
  | 'UPDATE_FOCUS_AREAS'
  | 'UPDATE_EXPERIENCE'
  | 'UPDATE_PROJECTS'
  | 'SET_STEP_COMPLETION'
  | 'SET_VALIDATION_ERRORS'
  | 'RESET_DATA'
  | 'LOAD_DATA'
  | 'UPDATE_METADATA';

export interface OnePagerAction {
  type: OnePagerActionType;
  payload?: unknown;
}

// Validation rules
export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => string | null;
}

export const VALIDATION_RULES: Record<string, ValidationRule[]> = {
  basicInfo: [
    { field: 'fullName', required: true, minLength: 2, maxLength: 100 },
    { field: 'position', required: true, minLength: 2, maxLength: 100 },
  ],
  focusAreas: [
    { 
      field: 'focusAreas', 
      customValidator: (areas: unknown) => {
        const areasArray = areas as string[];
        return areasArray.length === 0 ? 'At least one focus area is required' : null;
      }
    }
  ],
  experience: [
    { 
      field: 'experience', 
      customValidator: (exp: unknown) => {
        const expArray = exp as string[];
        return expArray.length === 0 ? 'At least one experience entry is required' : null;
      }
    }
  ],
  projects: [
    { 
      field: 'projects', 
      customValidator: (projects: unknown) => {
        const projectsArray = projects as string[];
        return projectsArray.length === 0 ? 'At least one project is recommended' : null;
      }
    }
  ]
};

// Storage keys
export const STORAGE_KEYS = {
  ONEPAGER_DATA: 'onepager_data',
  ONEPAGER_METADATA: 'onepager_metadata',
} as const;

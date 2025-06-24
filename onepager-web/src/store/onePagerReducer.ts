import type { OnePagerData, OnePagerAction, BasicInfo } from '../types/onepager';

// Create initial state
export const createInitialState = (): OnePagerData => ({
  basicInfo: {
    fullName: '',
    position: '',
    profilePhoto: undefined,
  },
  focusAreas: [],
  experience: [],
  projects: [],
  metadata: {
    lastUpdated: new Date(),
    version: '1.0.0',
    isComplete: false,
    stepCompletionStatus: {
      basicInfo: false,
      focus: false,
      experience: false,
      projects: false,
    },
  },
  validation: {
    errors: {},
    warnings: {},
    isValid: false,
  },
});

// OnePager reducer
export const onePagerReducer = (
  state: OnePagerData,
  action: OnePagerAction
): OnePagerData => {
  const newState = { ...state };
  newState.metadata.lastUpdated = new Date();

  switch (action.type) {
    case 'UPDATE_BASIC_INFO': {
      const basicInfo = action.payload as Partial<BasicInfo>;
      return {
        ...newState,
        basicInfo: { ...state.basicInfo, ...basicInfo },
      };
    }

    case 'UPDATE_FOCUS_AREAS': {
      const focusAreas = action.payload as string[];
      return {
        ...newState,
        focusAreas,
      };
    }

    case 'UPDATE_EXPERIENCE': {
      const experience = action.payload as string[];
      return {
        ...newState,
        experience,
      };
    }

    case 'UPDATE_PROJECTS': {
      const projects = action.payload as string[];
      return {
        ...newState,
        projects,
      };
    }

    case 'SET_STEP_COMPLETION': {
      const { step, isComplete } = action.payload as { step: keyof OnePagerData['metadata']['stepCompletionStatus'], isComplete: boolean };
      return {
        ...newState,
        metadata: {
          ...state.metadata,
          stepCompletionStatus: {
            ...state.metadata.stepCompletionStatus,
            [step]: isComplete,
          },
          isComplete: Object.values({
            ...state.metadata.stepCompletionStatus,
            [step]: isComplete,
          }).every(Boolean),
        },
      };
    }

    case 'SET_VALIDATION_ERRORS': {
      const { field, errors } = action.payload as { field: string, errors: string[] };
      const newErrors = { ...state.validation.errors };
      if (errors.length > 0) {
        newErrors[field] = errors;
      } else {
        delete newErrors[field];
      }
      
      return {
        ...newState,
        validation: {
          ...state.validation,
          errors: newErrors,
          isValid: Object.keys(newErrors).length === 0,
        },
      };
    }

    case 'RESET_DATA': {
      return createInitialState();
    }

    case 'LOAD_DATA': {
      const loadedData = action.payload as OnePagerData;
      return {
        ...loadedData,
        metadata: {
          ...loadedData.metadata,
          lastUpdated: new Date(),
        },
      };
    }

    case 'UPDATE_METADATA': {
      const metadata = action.payload as Partial<OnePagerData['metadata']>;
      return {
        ...newState,
        metadata: { ...state.metadata, ...metadata },
      };
    }

    default:
      return state;
  }
};

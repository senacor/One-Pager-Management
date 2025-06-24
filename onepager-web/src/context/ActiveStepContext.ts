import { createContext } from 'react';

export interface ActiveStepContextType {
  activeStepIndex: number;
  activeStepId: string;
  isStepActive: (stepId: string) => boolean;
}

export const ActiveStepContext = createContext<ActiveStepContextType | undefined>(undefined);

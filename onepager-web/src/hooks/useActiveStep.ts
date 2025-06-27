import { useContext } from 'react';
import { ActiveStepContext } from '../context/ActiveStepContext.ts';
import type { ActiveStepContextType } from '../context/ActiveStepContext.ts';

export const useActiveStep = (): ActiveStepContextType => {
  const context = useContext(ActiveStepContext);
  if (context === undefined) {
    throw new Error('useActiveStep must be used within an ActiveStepProvider');
  }
  return context;
};

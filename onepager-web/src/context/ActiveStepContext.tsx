import React from 'react';
import type { ReactNode } from 'react';
import { ActiveStepContext } from './ActiveStepContext';

interface ActiveStepProviderProps {
  children: ReactNode;
  activeStepIndex: number;
  sectionIds: string[];
}

export const ActiveStepProvider: React.FC<ActiveStepProviderProps> = ({
  children,
  activeStepIndex,
  sectionIds
}) => {
  const activeStepId = sectionIds[activeStepIndex] || '';
  
  const isStepActive = (stepId: string): boolean => {
    return stepId === activeStepId;
  };

  return (
    <ActiveStepContext.Provider value={{
      activeStepIndex,
      activeStepId,
      isStepActive
    }}>
      {children}
    </ActiveStepContext.Provider>
  );
};

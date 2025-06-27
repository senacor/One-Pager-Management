import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFormCompletion } from '../hooks/useOnePager';

interface ProgressNavProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  onImportClick?: () => void;
}

export const ProgressNav: React.FC<ProgressNavProps> = ({ currentStep, onStepClick, onImportClick }) => {
  const { t } = useTranslation();
  const { stepCompletionStatus, completionPercentage } = useFormCompletion();
  
  const steps = [
    { id: 'basic-info', label: t('steps.basicInfo.title'), stepKey: 'basicInfo' as const },
    { id: 'focus', label: t('steps.focus.title'), stepKey: 'focus' as const },
    { id: 'experience', label: t('steps.experience.title'), stepKey: 'experience' as const },
    { id: 'projects', label: t('steps.projects.title'), stepKey: 'projects' as const },
  ];
  
  return (
    <nav className="fixed top-0 bottom-0 left-0 w-64 bg-dark-nav p-5 flex flex-col z-10 shadow-lg">
      {/* Import Button at the top */}
      {onImportClick && (
        <div className="mb-4">
          <button
            onClick={onImportClick}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {t('import.title')}
          </button>
        </div>
      )}
      
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-white text-sm mb-2">
          <span>Progress</span>
          <span className="font-semibold">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div 
            className="bg-brand-blue h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Main navigation content - centered */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="relative">
          {/* Single vertical connector line that spans the entire progress */}
          <div className="absolute left-1.5 top-6 bottom-6 w-0.5 bg-gray-400">
            <div 
              className="w-full bg-brand-blue transition-all duration-300 ease-out"
              style={{
                height: `${(currentStep / (steps.length - 1)) * 100}%`
              }}
            />
          </div>
          
          <ul>
            {steps.map((step, index) => {
              const isCompleted = stepCompletionStatus[step.stepKey];
              const isCurrent = index === currentStep;
              const isActive = index <= currentStep;
              
              return (
                <li
                  key={step.id}
                  className={`relative pl-8 py-4 cursor-pointer text-sm font-medium transition-colors duration-300 hover:text-brand-blue ${
                    isActive ? 'text-brand-blue' : 'text-white'
                  } ${isCurrent ? 'font-semibold' : ''}`}
                  onClick={() => onStepClick(index)}
                >
                  {/* Dot with completion indicator */}
                  <div
                    className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-3 h-3 border-2 rounded-full transition-all duration-300 z-10 ${
                      isCompleted
                        ? 'bg-green-500 border-green-500'
                        : isActive
                        ? 'bg-brand-blue border-brand-blue'
                        : 'bg-white border-white'
                    }`}
                  >
                    {/* Checkmark for completed steps */}
                    {isCompleted && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Label with completion status */}
                  <div className="flex items-center justify-between">
                    <span className="leading-5">
                      {step.label}
                    </span>
                    {isCompleted && (
                      <span className="text-green-400 text-xs ml-2">✓</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      
      {/* Company logo at the bottom */}
      <div className="flex justify-center pb-2">
        <img 
          src="./senacor-logo.svg" 
          alt="Senacor Technologies" 
          className="h-8 w-auto transition-opacity duration-300 filter invert brightness-0 invert"
        />
      </div>
    </nav>
  );
};

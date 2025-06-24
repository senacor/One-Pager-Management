import React from 'react';
import { useTranslation } from 'react-i18next';

interface ProgressNavProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export const ProgressNav: React.FC<ProgressNavProps> = ({ currentStep, onStepClick }) => {
  const { t } = useTranslation();
  
  const steps = [
    { id: 'basic-info', label: t('steps.basicInfo.title') },
    { id: 'focus', label: t('steps.focus.title') },
    { id: 'experience', label: t('steps.experience.title') },
    { id: 'projects', label: t('steps.projects.title') },
  ];
  
  return (
    <nav className="fixed top-0 bottom-0 left-0 w-64 bg-dark-nav p-5 flex flex-col z-10 shadow-lg">
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
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={`relative pl-8 py-4 cursor-pointer text-sm font-medium transition-colors duration-300 hover:text-brand-blue ${
                  index === currentStep || index < currentStep ? 'text-brand-blue' : 'text-white'
                } ${index === currentStep ? 'font-semibold' : ''}`}
                onClick={() => onStepClick(index)}
              >
                {/* Dot - positioned at the center of the text line */}
                <div
                  className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-3 h-3 border-2 rounded-full transition-all duration-300 z-10 ${
                    index <= currentStep
                      ? 'bg-brand-blue border-brand-blue'
                      : 'bg-white border-white'
                  }`}
                />
                
                {/* Label */}
                <span className="leading-5">
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Company logo at the bottom */}
      <div className="flex justify-center pb-2">
        <img 
          src="/senacor-logo.svg" 
          alt="Senacor Technologies" 
          className="h-8 w-auto transition-opacity duration-300 filter invert brightness-0 invert"
        />
      </div>
    </nav>
  );
};

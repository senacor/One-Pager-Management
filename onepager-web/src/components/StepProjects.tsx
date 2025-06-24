import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Step } from './Step';
import { DynamicList } from './DynamicList';
import { useProjects } from '../hooks/useOnePager';
import { useAIForContext } from '../services';
import { useActiveStep } from '../hooks/useActiveStep';

export const StepProjects: React.FC = () => {
  const { t } = useTranslation();
  const { projects, updateProjects } = useProjects();
  const ai = useAIForContext('projects');
  const { isStepActive } = useActiveStep();
  
  // AI-powered contextual description function
  const getContextualDescription = useCallback(async (entries: string[]): Promise<string> => {
    const result = await ai.getDescription(entries, {
      baseDescription: "Showcase projects that demonstrate your key skills and impact"
    });
    
    return result?.description || `<ul><li>Showcase projects that demonstrate your key skills</li><li>Include both independent and collaborative work</li><li>Focus on business impact and technical challenges overcome</li></ul>`;
  }, [ai]);
  
  return (
    <Step
      id="projects"
      title={t('steps.projects.title')}
      descriptionKey='steps.projects.description'
      className="border-b-0"
    >
      <DynamicList
        placeholder={t('steps.projects.placeholder')}
        initialValues={projects}
        enableAISuggestions={true}
        enableContextualDescription={true}
        onGetContextualDescription={getContextualDescription}
        baseDescription="Showcase projects that demonstrate your key skills and impact"
        isActive={isStepActive('projects')}
        onChange={updateProjects}
      />
    </Step>
  );
};

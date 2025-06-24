import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Step } from './Step';
import { DynamicList } from './DynamicList';
import { useExperience } from '../hooks/useOnePager';
import { useAIForContext } from '../services';
import { useActiveStep } from '../hooks/useActiveStep';

export const StepExperience: React.FC = () => {
  const { t } = useTranslation();
  const { experience, updateExperience } = useExperience();
  const ai = useAIForContext('experience');
  const { isStepActive } = useActiveStep();

  // AI-powered contextual description function
  const getContextualDescription = useCallback(async (entries: string[]): Promise<string> => {
    const result = await ai.getDescription(entries, {
      baseDescription: "Showcase your professional experience and achievements"
    });
    
    return result?.description || `<ul><li>Experience entries should highlight your career progression and achievements</li><li>Include both technical contributions and business impact</li><li>Focus on measurable outcomes and specific technologies</li></ul>`;
  }, [ai]);

  return (
    <Step
      id="experience"
      title={t('steps.experience.title')}
      descriptionKey='steps.experience.description'
    >
      <DynamicList
        placeholder={t('steps.experience.placeholder')}
        initialValues={experience}
        enableAISuggestions={true}
        enableContextualDescription={true}
        onGetContextualDescription={getContextualDescription}
        baseDescription="Showcase your professional experience and achievements"
        isActive={isStepActive('experience')}
        onChange={updateExperience}
      />
    </Step>
  );
};

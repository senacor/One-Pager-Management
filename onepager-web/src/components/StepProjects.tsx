import React from 'react';
import { useTranslation } from 'react-i18next';
import { Step } from './Step';
import { DynamicList } from './DynamicList';

export const StepProjects: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <Step
      id="projects"
      title={t('steps.projects.title')}
      descriptionKey='steps.projects.description'
      className="border-b-0"
    >
      <DynamicList
        placeholder={t('steps.projects.placeholder')}
        enableAISuggestions={true}
        onChange={(values) => {
          // Handle project data changes here if needed
          console.log('Project entries:', values);
        }}
      />
    </Step>
  );
};

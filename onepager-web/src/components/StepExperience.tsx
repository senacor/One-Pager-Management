import React from 'react';
import { useTranslation } from 'react-i18next';
import { Step } from './Step';
import { DynamicList } from './DynamicList';

export const StepExperience: React.FC = () => {
  const { t } = useTranslation();

  // Mock function to provide contextual description for experience entries
  const getContextualDescription = async (entries: string[]): Promise<string> => {
    const filledEntries = entries.filter(entry => entry.trim().length > 0);
    
    if (filledEntries.length === 0) {
      return `<ul><li>Experience entries should highlight your career progression and achievements</li><li>Include both technical contributions and business impact</li><li>Focus on measurable outcomes and specific technologies</li></ul>`;
    }
    
    // Analyze experience entries
    const hasMetrics = filledEntries.some(entry => 
      /\d+%|\d+\w|\$\d+|increased|improved|reduced|saved/i.test(entry)
    );
    
    const hasLeadership = filledEntries.some(entry => 
      entry.toLowerCase().includes('led') || 
      entry.toLowerCase().includes('managed') ||
      entry.toLowerCase().includes('coordinated') ||
      entry.toLowerCase().includes('directed')
    );
    
    const hasTechnical = filledEntries.some(entry => 
      entry.toLowerCase().includes('developed') || 
      entry.toLowerCase().includes('implemented') ||
      entry.toLowerCase().includes('architected') ||
      entry.toLowerCase().includes('designed')
    );
    
    const hasProgression = filledEntries.length > 2;
    
    const suggestions = [];
    
    if (!hasMetrics) {
      suggestions.push('Consider adding quantifiable results (percentages, numbers, cost savings)');
    }
    
    if (!hasLeadership && hasTechnical) {
      suggestions.push('Include leadership or mentoring experiences to show career growth');
    }
    
    if (!hasTechnical && hasLeadership) {
      suggestions.push('Add technical achievements to demonstrate hands-on expertise');
    }
    
    if (!hasProgression) {
      suggestions.push('Show career progression with roles of increasing responsibility');
    }
    
    if (hasMetrics && hasLeadership && hasTechnical) {
      suggestions.push('Excellent balance! Consider organizing by impact or recency');
      suggestions.push('Ensure each entry tells a complete story of challenge → action → result');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Strong experience profile! Consider highlighting unique challenges you\'ve solved');
      suggestions.push('Think about cross-functional collaboration and stakeholder management');
    }
    
    return `<ul>${suggestions.map(s => `<li>${s}</li>`).join('')}</ul>`;
  };

  return (
    <Step
      id="experience"
      title={t('steps.experience.title')}
      descriptionKey='steps.experience.description'
    >
      <DynamicList
        placeholder={t('steps.experience.placeholder')}
        enableAISuggestions={true}
        enableContextualDescription={true}
        onGetContextualDescription={getContextualDescription}
        baseDescription="Showcase your professional experience and achievements"
        onChange={(values) => {
          // Handle experience data changes here if needed
          console.log('Experience entries:', values);
        }}
      />
    </Step>
  );
};

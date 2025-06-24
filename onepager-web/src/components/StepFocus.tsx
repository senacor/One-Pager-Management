import React from 'react';
import { useTranslation } from 'react-i18next';
import { Step } from './Step';
import { DynamicList } from './DynamicList';

export const StepFocus: React.FC = () => {
  const { t } = useTranslation();
  
  // Mock function to provide contextual description for focus areas
  const getContextualDescription = async (entries: string[]): Promise<string> => {
    // In a real implementation, this would call an AI service
    const filledEntries = entries.filter(entry => entry.trim().length > 0);
    
    if (filledEntries.length === 0) {
      return `<ul><li>Focus areas help potential clients understand your expertise</li><li>Include both technical skills and domain knowledge</li><li>Consider current market trends and demands</li></ul>`;
    }
    
    // Simple analysis for focus areas
    const hasTechnical = filledEntries.some(entry => 
      entry.toLowerCase().includes('development') || 
      entry.toLowerCase().includes('programming') ||
      entry.toLowerCase().includes('architecture') ||
      entry.toLowerCase().includes('technical')
    );
    
    const hasManagement = filledEntries.some(entry => 
      entry.toLowerCase().includes('management') || 
      entry.toLowerCase().includes('leadership') ||
      entry.toLowerCase().includes('strategy')
    );
    
    const hasDomain = filledEntries.some(entry => 
      entry.toLowerCase().includes('finance') || 
      entry.toLowerCase().includes('healthcare') ||
      entry.toLowerCase().includes('retail') ||
      entry.toLowerCase().includes('automotive')
    );
    
    if (hasTechnical && hasManagement) {
      return `<ul><li>Great balance of technical and leadership focus - this combination is highly valued</li><li>Consider adding specific technologies or methodologies you specialize in</li><li>Think about industry domains where you have deep experience</li></ul>`;
    }
    
    if (hasTechnical) {
      return `<ul><li>Strong technical focus - consider adding leadership or consulting aspects</li><li>Include emerging technologies you're working with</li><li>Consider adding domain expertise (e.g., fintech, healthtech)</li></ul>`;
    }
    
    if (hasManagement) {
      return `<ul><li>Leadership focus is valuable - consider adding technical depth</li><li>Include specific management methodologies (Agile, Scrum, etc.)</li><li>Think about team sizes and project scales you typically handle</li></ul>`;
    }
    
    if (hasDomain) {
      return `<ul><li>Domain expertise is valuable - consider adding how you apply it technically</li><li>Include specific challenges you solve in this domain</li><li>Think about emerging trends in your focus areas</li></ul>`;
    }
    
    return `<ul><li>Consider balancing different types of focus areas</li><li>Include both what you're expert in and what you're passionate about</li><li>Think about what makes you unique in the market</li></ul>`;
  };
  
  return (
    <Step
      id="focus"
      title={t('steps.focus.title')}
      descriptionKey="steps.focus.description"
    >
      <DynamicList
        placeholder={t('steps.focus.placeholder')}
        maxItems={5}
        enableAISuggestions={true}
        enableContextualDescription={true}
        onGetContextualDescription={getContextualDescription}
        baseDescription="Define your key areas of expertise and focus"
        onChange={(values) => {
          // Handle focus data changes here if needed
          console.log('Focus areas:', values);
        }}
      />
    </Step>
  );
};

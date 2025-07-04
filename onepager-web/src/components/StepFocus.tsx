import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Step } from './Step';
import { DynamicList } from './DynamicList';
import { useFocusAreas } from '../hooks/useOnePager';
import { useAIForContext } from '../services';
import { useActiveStep } from '../hooks/useActiveStep';

export const StepFocus: React.FC = () => {
    const { t } = useTranslation();
    const { focusAreas, updateFocusAreas } = useFocusAreas();
    const ai = useAIForContext('focusAreas');
    const { isStepActive } = useActiveStep();

    // AI-powered contextual description function
    const getContextualDescription = useCallback(async (entries: string[]): Promise<string> => {
        try {
            const result = await ai.getDescription(entries, {
                baseDescription: "Define your key areas of expertise and focus"
            });

            return result?.description || `<ul><li>Focus areas help potential clients understand your expertise</li><li>Include both technical skills and domain knowledge</li><li>Consider current market trends and demands</li></ul>`;
        } catch (error) {
            console.error('Error getting contextual description:', error);
            return `<ul><li>Focus areas help potential clients understand your expertise</li><li>Include both technical skills and domain knowledge</li><li>Consider current market trends and demands</li></ul>`;
        }
    }, [ai]); // Include the AI service object as dependency

    return (
        <Step
            id="focus"
            title={t('steps.focus.title')}
            descriptionKey="steps.focus.description"
        >
            <DynamicList
                placeholder={t('steps.focus.placeholder')}
                initialValues={focusAreas}
                maxItems={5}
                enableAISuggestions={true}
                enableContextualDescription={true}
                onGetContextualDescription={getContextualDescription}
                baseDescription="Define your key areas of expertise and focus"
                isActive={isStepActive('focus')}
                onChange={updateFocusAreas}
            />
        </Step>
    );
};

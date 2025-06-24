import React from 'react';
import { useTranslation } from 'react-i18next';
import { Step } from './Step';

interface StepBasicInfoProps {
  onNext: () => void;
}

export const StepBasicInfo: React.FC<StepBasicInfoProps> = ({ onNext }) => {
  const { t } = useTranslation();
  
  return (
    <Step
      id="basic-info"
      title={t('steps.basicInfo.title')}
    >
      <div className="space-y-5 max-w-2xl">
        <input
          type="text"
          placeholder={t('steps.basicInfo.fullNamePlaceholder')}
          className="block w-full p-4 border-2 border-gray-200 rounded-lg text-base bg-gray-50 transition-all duration-300 focus:outline-none focus:border-brand-blue focus:bg-white"
        />
        <input
          type="text"
          placeholder={t('steps.basicInfo.positionPlaceholder')}
          className="block w-full p-4 border-2 border-gray-200 rounded-lg text-base bg-gray-50 transition-all duration-300 focus:outline-none focus:border-brand-blue focus:bg-white"
        />
        
        <div className="mt-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('steps.basicInfo.profilePhotoLabel')}
          </label>
          <input
            type="file"
            accept="image/*"
            className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer transition-colors duration-300 bg-white hover:border-brand-blue focus:outline-none focus:border-brand-blue"
          />
        </div>
      </div>
    </Step>
  );
};

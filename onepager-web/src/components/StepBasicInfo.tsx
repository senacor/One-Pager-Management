import React from 'react';
import { useTranslation } from 'react-i18next';
import { Step } from './Step';
import { useBasicInfo } from '../hooks/useOnePager';
import { Position, type PositionType } from '../types/onepager';

interface StepBasicInfoProps {
  onNext: () => void;
}

export const StepBasicInfo: React.FC<StepBasicInfoProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const { basicInfo, updateBasicInfo, errors, isValid } = useBasicInfo();
  
  // TODO: Use onNext when implementing navigation logic
  console.log('onNext callback available:', !!onNext);
  
  return (
    <Step
      id="basic-info"
      title={t('steps.basicInfo.title')}
    >
      <div className="space-y-5 max-w-2xl">
        <div>
          <input
            type="text"
            placeholder={t('steps.basicInfo.fullNamePlaceholder')}
            value={basicInfo.fullName}
            onChange={(e) => updateBasicInfo({ fullName: e.target.value })}
            className={`block w-full p-4 border-2 rounded-lg text-base bg-gray-50 transition-all duration-300 focus:outline-none focus:bg-white ${
              errors.some(e => e.includes('fullName')) 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-200 focus:border-brand-blue'
            }`}
          />
          {errors.filter(e => e.includes('fullName')).map((error, index) => (
            <p key={index} className="text-red-500 text-sm mt-1">{error}</p>
          ))}
        </div>
        
        <div>
          <select
            value={basicInfo.position}
            onChange={(e) => updateBasicInfo({ position: e.target.value as PositionType | '' })}
            className={`block w-full p-4 border-2 rounded-lg text-base bg-gray-50 transition-all duration-300 focus:outline-none focus:bg-white ${
              errors.some(e => e.includes('position')) 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-200 focus:border-brand-blue'
            }`}
          >
            <option value="">{t('steps.basicInfo.positionPlaceholder')}</option>
            
            {/* Junior Level */}
            <optgroup label="Junior">
              <option value={Position.JUNIOR_CONSULTANT}>{Position.JUNIOR_CONSULTANT}</option>
              <option value={Position.JUNIOR_DEVELOPER}>{Position.JUNIOR_DEVELOPER}</option>
            </optgroup>
            
            {/* Senior Level */}
            <optgroup label="Senior">
              <option value={Position.SENIOR_CONSULTANT}>{Position.SENIOR_CONSULTANT}</option>
              <option value={Position.SENIOR_DEVELOPER}>{Position.SENIOR_DEVELOPER}</option>
            </optgroup>
            
            {/* Leads and Experts Level */}
            <optgroup label="Leads and Experts">
              <option value={Position.MANAGING_CONSULTANT}>{Position.MANAGING_CONSULTANT}</option>
              <option value={Position.DELIVERY_MANAGER}>{Position.DELIVERY_MANAGER}</option>
              <option value={Position.ARCHITECT}>{Position.ARCHITECT}</option>
              <option value={Position.LEAD_DEVELOPER}>{Position.LEAD_DEVELOPER}</option>
              <option value={Position.TECHNICAL_EXPERT}>{Position.TECHNICAL_EXPERT}</option>
            </optgroup>
          </select>
          {errors.filter(e => e.includes('position')).map((error, index) => (
            <p key={index} className="text-red-500 text-sm mt-1">{error}</p>
          ))}
        </div>
        
        <div className="mt-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('steps.basicInfo.profilePhotoLabel')}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                updateBasicInfo({ profilePhoto: file });
              }
            }}
            className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer transition-colors duration-300 bg-white hover:border-brand-blue focus:outline-none focus:border-brand-blue"
          />
        </div>
        
        {/* Show overall validation status */}
        {!isValid && errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600 text-sm">Please fix the errors above to continue.</p>
          </div>
        )}
        
        {isValid && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-600 text-sm">✓ Basic information is complete!</p>
          </div>
        )}
      </div>
    </Step>
  );
};

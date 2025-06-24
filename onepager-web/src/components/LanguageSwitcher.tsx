import React from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'de' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="fixed top-4 right-4 z-20 bg-white text-2xl px-3 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-brand-blue"
      title={i18n.language === 'en' ? 'Switch to German' : 'Switch to English'}
    >
      {i18n.language === 'en' ? '🇩🇪' : '🇺🇸'}
    </button>
  );
};

import React, { createContext, useState, useContext } from 'react';
import en from '../locales/en';
import pt from '../locales/pt';
import es from '../locales/es';

const translations = { en, pt, es };

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(
    () => localStorage.getItem('pricepilot_lang') || 'en'
  );

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('pricepilot_lang', lang);
  };

  const t = (key) => {
    return translations[language]?.[key] ?? translations.en?.[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

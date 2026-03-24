// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
import React from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
  { code: 'es', label: 'ES' },
];

export default function LanguageSwitcher({ className }) {
  const { language, changeLanguage } = useLanguage();

  return (
    <div className={cn('flex items-center gap-0.5 bg-slate-100 rounded-xl p-1', className)}>
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => changeLanguage(code)}
          className={cn(
            'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
            language === code
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

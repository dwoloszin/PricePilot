// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/LanguageContext';

export default function LoginPrompt({ message }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">{t('common.loginRequired')}</h2>
      <p className="text-slate-500 text-sm mb-6 max-w-xs">{message}</p>
      <Button
        onClick={() => navigate('/Login')}
        className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8 rounded-xl"
      >
        <LogIn className="w-4 h-4 mr-2" />
        {t('common.logIn')}
      </Button>
    </div>
  );
}

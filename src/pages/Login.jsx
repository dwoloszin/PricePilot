// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, Users, Mail, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import TargetLogo from '@/components/ui/TargetLogo';
import { isSignInWithEmailLink } from 'firebase/auth';
import { auth } from '@/api/firebaseClient';
import { toast } from 'sonner';

export default function Login() {
  const { loginWithGoogle, sendMagicLink, loginWithEmailLink, isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail]             = useState('');
  const [emailSent, setEmailSent]     = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError]   = useState('');
  // When user opens link on a different device, no email in localStorage
  const [confirmEmail, setConfirmEmail] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);

  // Detect magic link opened on a different device (email not in localStorage)
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const stored = localStorage.getItem('emailForSignIn');
      if (!stored) setNeedsConfirm(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user && !user.username) navigate('/UsernameSetup');
      else navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailLoading(true);
    setEmailError('');
    try {
      await sendMagicLink(email.trim());
      setEmailSent(true);
    } catch (err) {
      setEmailError('Erro ao enviar o link. Verifique o e-mail e tente novamente.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConfirmEmailLink = async (e) => {
    e.preventDefault();
    if (!confirmEmail.trim()) return;
    setEmailLoading(true);
    setEmailError('');
    try {
      const userData = await loginWithEmailLink(confirmEmail.trim(), window.location.href);
      toast.success('Login realizado com sucesso!');
      if (!userData.username) navigate('/UsernameSetup');
      else navigate('/');
    } catch (err) {
      setEmailError('Link inválido ou expirado. Solicite um novo link.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSuccess = async (credentialResponse) => {
    try {
      const userData = await loginWithGoogle(credentialResponse);
      toast.success('Successfully logged in!');

      // If user has no username, go to setup, otherwise go home
      if (userData && !userData.username) {
        navigate('/UsernameSetup');
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    }
  };

  const handleError = () => {
    toast.error('Google Login failed');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Back button */}
      <div className="fixed top-4 left-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
            <TargetLogo className="w-11 h-11" color="white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Bem na Mosca</h1>
          <p className="text-slate-500">{t('login.subtitle')}</p>
        </div>

        {/* Features */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{t('login.secureAccess')}</h3>
              <p className="text-sm text-slate-500">{t('login.secureAccessDesc')}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{t('login.syncEverywhere')}</h3>
              <p className="text-sm text-slate-500">{t('login.syncEverywhereDesc')}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{t('login.communityDriven')}</h3>
              <p className="text-sm text-slate-500">{t('login.communityDrivenDesc')}</p>
            </div>
          </div>
        </div>

        {/* Login options */}
        <div className="space-y-4">

          {/* ── "Different device" confirm email ── */}
          {needsConfirm && (
            <form onSubmit={handleConfirmEmailLink} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
              <p className="text-sm text-amber-800 font-medium">Confirme seu e-mail para entrar</p>
              <Input
                type="email"
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-11 bg-white border-amber-300"
                required
              />
              {emailError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{emailError}
                </p>
              )}
              <Button type="submit" disabled={emailLoading} className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
                {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar e entrar'}
              </Button>
            </form>
          )}

          {/* ── Google ── */}
          {!needsConfirm && (
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                useOneTap
                theme="filled_blue"
                shape="pill"
                size="large"
                width="100%"
              />
            </div>
          )}

          {/* ── Divider ── */}
          {!needsConfirm && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">ou</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          )}

          {/* ── Magic link ── */}
          {!needsConfirm && !emailSent && (
            <form onSubmit={handleSendMagicLink} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                  placeholder="seu@email.com"
                  className="h-11 bg-white border-slate-200 flex-1"
                  required
                />
                <Button
                  type="submit"
                  disabled={emailLoading || !email.trim()}
                  className="h-11 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shrink-0"
                >
                  {emailLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Mail className="w-4 h-4" />}
                </Button>
              </div>
              {emailError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{emailError}
                </p>
              )}
              <p className="text-[10px] text-slate-400 text-center">
                Enviaremos um link mágico para seu e-mail — sem senha necessária
              </p>
            </form>
          )}

          {/* ── Magic link sent ── */}
          {!needsConfirm && emailSent && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Link enviado!</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para entrar.
                </p>
                <button
                  onClick={() => { setEmailSent(false); setEmail(''); }}
                  className="text-xs text-emerald-600 underline mt-2"
                >
                  Usar outro e-mail
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400 text-center px-8">
            {t('login.terms')}
          </p>
        </div>

        {/* Language Switcher */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-slate-400">{t('login.language')}</span>
          <LanguageSwitcher />
        </div>

        {/* Guest Access */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-slate-500 hover:text-emerald-600"
          >
            {t('login.continueAsGuest')}
          </Button>
        </div>
      </div>
    </div>
  );
}

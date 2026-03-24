
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import TargetLogo from '@/components/ui/TargetLogo';
import { toast } from 'sonner';

export default function Login() {
  const { loginWithGoogle, isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // If already authenticated, redirect to home or username setup
  React.useEffect(() => {
    if (isAuthenticated) {
      if (user && !user.username) {
        navigate('/UsernameSetup');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

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

        {/* Login Button */}
        <div className="flex flex-col items-center space-y-4">
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

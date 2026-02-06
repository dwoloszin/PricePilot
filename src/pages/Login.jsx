
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, Zap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Login() {
  const { loginWithGoogle, isAuthenticated, user } = useAuth();
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
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">PricePilot</h1>
          <p className="text-slate-500">Your personal shopping co-pilot</p>
        </div>

        {/* Features */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Secure Access</h3>
              <p className="text-sm text-slate-500">Keep your shopping lists and price history safe.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Sync Everywhere</h3>
              <p className="text-sm text-slate-500">Access your data from any device instantly.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Community Driven</h3>
              <p className="text-sm text-slate-500">Contribute prices and help others save money.</p>
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
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        {/* Guest Access */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-slate-500 hover:text-emerald-600"
          >
            Continue as Guest
          </Button>
        </div>
      </div>
    </div>
  );
}

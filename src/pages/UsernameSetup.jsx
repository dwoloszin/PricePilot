
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function UsernameSetup() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If user already has a username, skip setup
  useEffect(() => {
    if (isAuthenticated && user?.username) {
      navigate('/');
    }
  }, [user, isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !user) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      // Check if username is unique in local storage (mock DB check)
      const allUsers = JSON.parse(localStorage.getItem('pricepilot_all_users') || '[]');
      const isTaken = allUsers.some(u => 
        u.username.toLowerCase() === username.toLowerCase() && u.id !== user.id
      );

      if (isTaken) {
        setError('This username is already taken. Please try another one.');
        setIsSubmitting(false);
        return;
      }

      // Update current user in storage
      const updatedUser = { ...user, username: username.trim() };
      localStorage.setItem('pricepilot_user', JSON.stringify(updatedUser));
      
      // Update the "all users" list for future checks
      const userIndex = allUsers.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        allUsers[userIndex].username = username.trim();
      } else {
        allUsers.push({ id: user.id, username: username.trim() });
      }
      localStorage.setItem('pricepilot_all_users', JSON.stringify(allUsers));

      // Force AuthContext to reload from localStorage
      window.dispatchEvent(new Event('storage'));

      toast.success('Username set successfully!');
      
      // Use navigate for relative routing (works on any host)
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (err) {
      console.error('Error setting username:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Choose Username</h1>
          <p className="text-slate-500">Welcome {user?.full_name}! Please pick a unique username to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="e.g., price_hunter_99"
                className="h-12 pl-4 bg-slate-50 border-slate-200 focus:bg-white"
                required
                minLength={3}
                maxLength={20}
              />
            </div>
            <p className="text-[10px] text-slate-400">Only letters, numbers, and underscores allowed.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isSubmitting || username.length < 3}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Complete Setup
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => logout()}
            className="text-slate-400 hover:text-red-500"
          >
            Sign out and try later
          </Button>
        </div>
      </div>
    </div>
  );
}

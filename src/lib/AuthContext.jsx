
import React, { createContext, useState, useContext, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { clearSharedDataCache } from './query-client.js';
import { auth } from '../api/firebaseClient';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

const AuthContext = createContext(null);

// Your Google Client ID
const GOOGLE_CLIENT_ID = "209508189280-7su563c2ofm82jadt9t965rbeh72dg2h.apps.googleusercontent.com";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'github-app', public_settings: {} });

  useEffect(() => {
    checkUserAuth();
    
    // Listen for storage changes to sync state
    const handleStorageChange = () => {
      checkUserAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const storedUser = localStorage.getItem('pricepilot_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
    }
  };

  const loginWithGoogle = async (credentialResponse) => {
    try {
      setIsLoadingAuth(true);
      
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const googleUser = JSON.parse(jsonPayload);
      
      // Check if this user already has a username in our "all users" list
      const allUsers = JSON.parse(localStorage.getItem('pricepilot_all_users') || '[]');
      const existingUserRecord = allUsers.find(u => u.id === googleUser.sub);
      
      const userData = {
        id: googleUser.sub,
        full_name: googleUser.name,
        email: googleUser.email,
        picture: googleUser.picture,
        provider: 'google',
        username: existingUserRecord ? existingUserRecord.username : null
      };

      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('pricepilot_user', JSON.stringify(userData));
      // Also sign the user into Firebase Auth so Firestore rules that require
      // authenticated requests will succeed. We use the same Google ID token
      // returned by the Google One Tap / sign-in flow.
      try {
        const firebaseCred = GoogleAuthProvider.credential(credentialResponse.credential);
        await signInWithCredential(auth, firebaseCred);
      } catch (fbErr) {
        console.warn('Firebase sign-in failed:', fbErr);
      }
      setIsLoadingAuth(false);
      
      // Clear database cache to get fresh data from previous login
      clearDatabaseCache();
      
      // Clear React Query cache to force fresh queries
      clearSharedDataCache();
      
      return userData;
    } catch (error) {
      console.error('Google login failed:', error);
      setAuthError({ type: 'auth_failed', message: 'Google login failed' });
      setIsLoadingAuth(false);
      throw error;
    }
  };

  /**
   * Clear database cache from localStorage to prevent data leakage between users
   * This ensures a new user doesn't see data from the previous user
   */
  const clearDatabaseCache = () => {
    const entities = ['Product', 'PriceEntry', 'Store', 'ShoppingList', 'User'];
    entities.forEach(entity => {
      localStorage.removeItem(`pricepilot_db_data/${entity}.json`);
    });
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear user data from localStorage
    localStorage.removeItem('pricepilot_user');
    
    // Clear database cache (prevents data leakage between users)
    clearDatabaseCache();
    
    // Clear React Query cache
    clearSharedDataCache();
    
    // Use hash navigation for GitHub Pages compatibility
    window.location.hash = '#/Login';
  };

  const navigateToLogin = () => {
    if (!window.location.hash.includes('#/Login')) {
      window.location.hash = '#/Login';
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContext.Provider value={{ 
        user, 
        isAuthenticated, 
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        loginWithGoogle,
        navigateToLogin,
        checkAppState: checkUserAuth
      }}>
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

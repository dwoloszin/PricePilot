// ──────────────────────────────────────────────────────────
// Bem na Mosca — DARIO WOLOSZIN
// https://github.com/dwoloszin
// ──────────────────────────────────────────────────────────

import React, { createContext, useState, useContext, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { clearSharedDataCache } from './query-client.js';
import { auth, db, serverTimestamp } from '../api/firebaseClient';
import {
  GoogleAuthProvider,
  signInWithCredential,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';

const AuthContext = createContext(null);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'github-app', public_settings: {} });

  useEffect(() => {
    // If URL is a magic link and email is stored, auto-complete sign-in
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const storedEmail = localStorage.getItem('emailForSignIn');
      if (storedEmail) {
        loginWithEmailLink(storedEmail, window.location.href);
        return;
      }
      // No email stored (different device) — Login page will handle it
    }

    checkUserAuth();

    const handleStorageChange = () => { checkUserAuth(); };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const storedUser = localStorage.getItem('pricepilot_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Backfill created_date for users who logged in before this field was added
        if (!parsedUser.created_date) {
          parsedUser.created_date = new Date().toISOString();
          localStorage.setItem('pricepilot_user', JSON.stringify(parsedUser));
        }
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

      // Decode Google JWT to get profile info
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      const googleUser = JSON.parse(jsonPayload);

      const allUsers = JSON.parse(localStorage.getItem('pricepilot_all_users') || '[]');

      // ── Firebase sign-in (with account-linking fallback) ────────────
      let firebaseUid = googleUser.sub; // fallback if Firebase fails
      let isLinked    = false;

      try {
        const firebaseCred = GoogleAuthProvider.credential(credentialResponse.credential);
        const fbResult     = await signInWithCredential(auth, firebaseCred);
        firebaseUid = fbResult.user.uid;
      } catch (fbErr) {
        if (fbErr.code === 'auth/account-exists-with-different-credential') {
          // Email already registered via email link — find that account
          const existingByEmail = allUsers.find(u => u.email === googleUser.email);
          if (existingByEmail) {
            firebaseUid = existingByEmail.id;
            isLinked    = true;
          }
        } else {
          console.warn('Firebase sign-in failed:', fbErr);
        }
      }

      // Resolve existing record by UID or by email (linked case)
      const existingRecord =
        allUsers.find(u => u.id === firebaseUid) ||
        (isLinked ? allUsers.find(u => u.email === googleUser.email) : null);

      const userData = {
        id:           firebaseUid,
        full_name:    googleUser.name,
        email:        googleUser.email,
        picture:      googleUser.picture,
        provider:     isLinked ? 'email+google' : 'google',
        username:     existingRecord?.username || null,
        created_date: existingRecord?.created_date || new Date().toISOString(),
      };

      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('pricepilot_user', JSON.stringify(userData));

      // Upsert Firestore record (merge keeps existing fields like likes/dislikes)
      try {
        await setDoc(doc(db, 'User', firebaseUid), {
          ...userData,
          created_date: new Date().toISOString(),
          likes: [], dislikes: [], likes_names: [], dislikes_names: [],
        }, { merge: true });
      } catch (fsErr) {
        console.warn('Failed to update User in Firestore:', fsErr);
      }

      setIsLoadingAuth(false);
      clearDatabaseCache();
      clearSharedDataCache();

      return userData;
    } catch (error) {
      console.error('Google login failed:', error);
      setAuthError({ type: 'auth_failed', message: 'Google login failed' });
      setIsLoadingAuth(false);
      throw error;
    }
  };

  const sendMagicLink = async (email) => {
    const actionCodeSettings = {
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    localStorage.setItem('emailForSignIn', email);
  };

  const loginWithEmailLink = async (email, emailLink) => {
    try {
      setIsLoadingAuth(true);
      const result = await signInWithEmailLink(auth, email, emailLink);
      const firebaseUser = result.user;

      const allUsers = JSON.parse(localStorage.getItem('pricepilot_all_users') || '[]');
      const existingUserRecord = allUsers.find(u => u.id === firebaseUser.uid);

      const userData = {
        id:           firebaseUser.uid,
        full_name:    firebaseUser.displayName || email.split('@')[0],
        email:        firebaseUser.email,
        picture:      firebaseUser.photoURL || null,
        provider:     'email',
        username:     existingUserRecord?.username || null,
        created_date: existingUserRecord?.created_date || new Date().toISOString(),
      };

      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('pricepilot_user', JSON.stringify(userData));
      localStorage.removeItem('emailForSignIn');

      try {
        const userDocRef = doc(db, 'User', firebaseUser.uid);
        await setDoc(userDocRef, {
          ...userData,
          created_date: new Date().toISOString(),
          likes: [], dislikes: [], likes_names: [], dislikes_names: [],
        }, { merge: true });
      } catch (fsErr) {
        console.warn('Failed to create/update User in Firestore:', fsErr);
      }

      clearDatabaseCache();
      clearSharedDataCache();
      setIsLoadingAuth(false);

      // Clean magic link params from URL
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);

      return userData;
    } catch (error) {
      console.error('Email link sign-in failed:', error);
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
        sendMagicLink,
        loginWithEmailLink,
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

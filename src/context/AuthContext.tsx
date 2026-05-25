import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDoc 
} from 'firebase/firestore';
import { auth, db, getFirebaseIdToken, loginWithGoogle, logout } from '../lib/firebase';
import {
  clearBackendAuthTokens,
  getFavorites,
  loginWithGoogleBackend,
  setBackendAuthTokens,
  toggleFavoriteBackend,
} from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  favorites: string[];
  authError: string | null;
  isFavorited: (id: string) => boolean;
  toggleFavorite: (artwork: { id: string, title: string, imageUrl: string }) => Promise<boolean>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  const mapAuthError = (error: unknown) => {
    const errorCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string'
        ? (error as { code: string }).code
        : '';

    switch (errorCode) {
      case 'auth/unauthorized-domain':
        return 'Google sign-in is blocked because this domain is not authorized in Firebase Auth.';
      case 'auth/operation-not-allowed':
        return 'Google sign-in is not enabled in Firebase Authentication yet.';
      case 'auth/popup-blocked':
        return 'The browser blocked the Google sign-in popup. Allow popups and try again.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in was cancelled before it completed.';
      case 'auth/cancelled-popup-request':
        return 'Another sign-in popup interrupted the current Google login attempt.';
      case 'auth/network-request-failed':
        return 'Google sign-in could not reach Firebase. Check your connection and try again.';
      default:
        return error instanceof Error ? error.message : 'Google sign-in failed. Please try again.';
    }
  };

  const syncBackendGoogleSession = async () => {
    const idToken = await getFirebaseIdToken();
    const session = await loginWithGoogleBackend(idToken);
    setBackendAuthTokens(session.access, session.refresh);
    return session.user;
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        try {
          setAuthError(null);
          await syncBackendGoogleSession();
        } catch (error) {
          console.error('Backend session sync error:', error);
          setAuthError(mapAuthError(error));
          clearBackendAuthTokens();
          setFavorites([]);
          setUser(null);
          await logout().catch(() => undefined);
          setLoading(false);
          return;
        }

        try {
          // Sync user profile
          const userRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userRef);
          
          const profileData = {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            updatedAt: serverTimestamp(),
          };

          if (!userSnap.exists()) {
            await setDoc(userRef, {
              ...profileData,
              createdAt: serverTimestamp(),
              role: 'user'
            });
          } else {
            await setDoc(userRef, profileData, { merge: true });
          }
        } catch (error) {
          console.error('Non-blocking Firestore profile sync error:', error);
        }
      } else {
        setFavorites([]);
        clearBackendAuthTokens();
      }

      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }

    let isCancelled = false;

    const loadFavorites = async () => {
      try {
        const favoriteItems = await getFavorites();
        if (!isCancelled) {
          setFavorites(favoriteItems.map((item) => item.artwork.id));
        }
      } catch (error) {
        console.error('Failed to load backend favorites:', error);
        if (!isCancelled) {
          setFavorites([]);
        }
      }
    };

    void loadFavorites();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const isFavorited = (id: string) => favorites.includes(id);

  const signIn = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setAuthError(mapAuthError(error));
      clearBackendAuthTokens();
      setFavorites([]);
      setUser(null);
      await logout().catch(() => undefined);
    }
  };

  const signOut = async () => {
    clearBackendAuthTokens();
    setAuthError(null);
    await logout();
  };

  const toggleFavorite = async (artwork: { id: string, title: string, imageUrl: string }) => {
    if (!user) {
      await signIn();
      return false;
    }

    try {
      const backendArtworkId = Number(artwork.id);
      if (Number.isNaN(backendArtworkId)) {
        throw new Error('Favorite toggles require a backend artwork id.');
      }

      const response = await toggleFavoriteBackend(backendArtworkId);
      setFavorites((current) =>
        response.favorited
          ? Array.from(new Set([...current, artwork.id]))
          : current.filter((id) => id !== artwork.id)
      );
      return true;
    } catch (error) {
      console.error('Failed to toggle backend favorite:', error);
      setAuthError(error instanceof Error ? error.message : 'Favorite update failed.');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      favorites, 
      authError,
      isFavorited,
      toggleFavorite,
      signIn,
      signOut,
      clearAuthError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

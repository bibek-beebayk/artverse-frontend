import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp, 
  collection, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  favorites: string[];
  isFavorited: (id: string) => boolean;
  toggleFavorite: (artwork: { id: string, title: string, imageUrl: string }) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      if (u) {
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
          console.error("Profile sync error:", error);
        }
      } else {
        setFavorites([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Sync favorites in real-time
  useEffect(() => {
    if (!user) return;

    const favoritesRef = collection(db, 'users', user.uid, 'favorites');
    const unsubscribeFavs = onSnapshot(favoritesRef, (snapshot) => {
      const favIds = snapshot.docs.map(doc => doc.id);
      setFavorites(favIds);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/favorites`);
    });

    return () => unsubscribeFavs();
  }, [user]);

  const isFavorited = (id: string) => favorites.includes(id);

  const signIn = async () => {
    await loginWithGoogle();
  };

  const toggleFavorite = async (artwork: { id: string, title: string, imageUrl: string }) => {
    if (!user) {
      await signIn();
      return;
    }
    
    const favoriteRef = doc(db, 'users', user.uid, 'favorites', artwork.id);
    const path = `users/${user.uid}/favorites/${artwork.id}`;

    try {
      if (isFavorited(artwork.id)) {
        await deleteDoc(favoriteRef);
      } else {
        await setDoc(favoriteRef, {
          userId: user.uid,
          artworkId: artwork.id,
          artworkTitle: artwork.title,
          artworkImageUrl: artwork.imageUrl,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      favorites, 
      isFavorited,
      toggleFavorite,
      signIn,
      signOut: logout 
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

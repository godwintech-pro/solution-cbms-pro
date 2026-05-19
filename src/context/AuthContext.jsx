import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userBranch, setUserBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login function
  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout function
  async function logout() {
    return signOut(auth);
  }

  // Watch auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserRole(data.role);
          setUserName(data.name);
          setUserBranch(data.branch);
        }
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserName(null);
        setUserBranch(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    userName,
    userBranch,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser } from '../types';
import {
  loginWithDb,
  registerWithDb,
  ensureDefaultUsers,
  fetchUserByUid,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ANALYST_EMAIL,
  DEFAULT_RELBIO_EMAIL,
  RUNTIME_ADMIN_EMAIL,
} from '../services/firestoreService';

const AUTH_STORAGE_KEY = 'equip_control_active_user';

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isAnalyst: boolean;
  isRelbio: boolean;
  canEditStock: boolean;
  canEditForecast: boolean;
  canManageTabs: boolean;
  onlyCurrentMonth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth state and ensure default admin users are seeded in database
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Guarantee default admin and analyst users exist (non-blocking)
        ensureDefaultUsers().catch((e) =>
          console.warn('Initial users check warning:', e)
        );

        // Check if there is an active logged-in session saved locally
        const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedSession) {
          try {
            const parsedUser = JSON.parse(savedSession) as AppUser;
            if (parsedUser && parsedUser.uid) {
              if (isMounted) {
                setCurrentUser(parsedUser);
              }
              // Try to fetch fresh profile in background
              fetchUserByUid(parsedUser.uid).then((freshProfile) => {
                if (isMounted && freshProfile) {
                  setCurrentUser(freshProfile);
                  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(freshProfile));
                }
              }).catch((err) => console.warn('Background profile refresh error:', err));
            }
          } catch (parseErr) {
            console.warn('Failed to parse saved auth session:', parseErr);
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const user = await loginWithDb(email, pass);
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Could not store session in localStorage:', e);
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    const user = await registerWithDb(name, email, pass);
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Could not store session in localStorage:', e);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Could not remove session from localStorage:', e);
    }
    setCurrentUser(null);
  };

  const refreshProfile = async () => {
    if (currentUser?.uid) {
      const fresh = await fetchUserByUid(currentUser.uid);
      if (fresh) {
        setCurrentUser(fresh);
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fresh));
        } catch (e) {
          console.warn('Could not update session in localStorage:', e);
        }
      }
    }
  };

  const userEmail = currentUser?.email?.toLowerCase() || '';
  const userRole = currentUser?.role?.toLowerCase() || '';

  const isAdmin =
    userRole === 'admin' ||
    userEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
    userEmail === RUNTIME_ADMIN_EMAIL.toLowerCase();

  const isAnalyst =
    userRole === 'analista' ||
    userEmail === DEFAULT_ANALYST_EMAIL.toLowerCase();

  const isRelbio =
    userRole === 'relbio' ||
    userEmail === DEFAULT_RELBIO_EMAIL.toLowerCase();

  // Stock quantities: only Admin can add/edit/change quantities
  const canEditStock = isAdmin;

  // Forecast: Admin and Analyst can add/edit/delete, Relbio CANNOT
  const canEditForecast = !isRelbio;

  // Tabs: only Admin can create, delete, or rename tabs
  const canManageTabs = isAdmin;

  // Relbio only sees current month
  const onlyCurrentMonth = isRelbio;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        isAdmin,
        isAnalyst,
        isRelbio,
        canEditStock,
        canEditForecast,
        canManageTabs,
        onlyCurrentMonth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


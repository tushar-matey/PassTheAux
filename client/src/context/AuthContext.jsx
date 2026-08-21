import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('passtheaux_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user profile on initial mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await authApi.getMe();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // Login with email + password
  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    if (data.success && data.token) {
      localStorage.setItem('passtheaux_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    }
    throw new Error(data.message || 'Login failed');
  };

  // Register with name, email + password
  const register = async (name, email, password) => {
    const data = await authApi.register({ name, email, password });
    if (data.success && data.token) {
      localStorage.setItem('passtheaux_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    }
    throw new Error(data.message || 'Registration failed');
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('passtheaux_token');
    setToken(null);
    setUser(null);
  };

  // Set auth token directly
  const setAuthToken = (newToken) => {
    localStorage.setItem('passtheaux_token', newToken);
    setToken(newToken);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const data = await authApi.getMe();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        setAuthToken,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

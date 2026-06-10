import React, { createContext, useContext, useState } from 'react';

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [successCallback, setSuccessCallback] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

  const loginUser = (userData) => {
    setUser(userData);
  };

  const logoutUser = () => {
    setUser(null);
  };

  const openLogin = (onSuccess = null) => {
    setMode('login');
    setSuccessCallback(() => onSuccess);
    setIsOpen(true);
  };

  const openSignup = (onSuccess = null) => {
    setMode('signup');
    setSuccessCallback(() => onSuccess);
    setIsOpen(true);
  };

  const closeAuth = () => {
    setIsOpen(false);
    setSuccessCallback(null);
  };

  const executeSuccessCallback = () => {
    if (successCallback) {
      successCallback();
    }
  };

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        mode,
        setMode,
        openLogin,
        openSignup,
        closeAuth,
        executeSuccessCallback,
        user,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}

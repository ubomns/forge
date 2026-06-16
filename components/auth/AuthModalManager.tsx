/**
 * Auth modal manager — controls which modal is open and provides open functions.
 *
 * Usage:
 *   import { useAuthModal } from '@/components/auth/AuthModalManager';
 *   const { openLogin, openSignup } = useAuthModal();
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { AuthModal } from './AuthModal';

interface AuthModalContextValue {
  openLogin: () => void;
  openSignup: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue>({
  openLogin: () => {},
  openSignup: () => {},
});

export function useAuthModal() {
  return useContext(AuthModalContext);
}

export function AuthModalManager({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isOpen, setIsOpen] = useState(false);

  const openLogin = useCallback(() => {
    setMode('login');
    setIsOpen(true);
  }, []);

  const openSignup = useCallback(() => {
    setMode('signup');
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const switchMode = useCallback(() => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
  }, []);

  const handleSuccess = useCallback(() => {
    // Trigger a page reload or auth state refresh
    window.location.reload();
  }, []);

  return (
    <AuthModalContext.Provider value={{ openLogin, openSignup }}>
      {children}
      <AuthModal
        mode={mode}
        isOpen={isOpen}
        onClose={closeModal}
        onSwitchMode={switchMode}
        onSuccess={handleSuccess}
      />
    </AuthModalContext.Provider>
  );
}

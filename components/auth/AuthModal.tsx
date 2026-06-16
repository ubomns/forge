/**
 * Auth modal — handles both login and signup in a single component.
 *
 * Design tokens from globals.css:
 *   --surface: #181818 (card bg)
 *   --border-strong: #494949 (border)
 *   --accent: #ffc000 (gold)
 *   --text: #ffffff
 *   --text-2: #969696
 *   --error-text: #ff6b6b
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  mode: 'login' | 'signup';
  isOpen: boolean;
  onClose: () => void;
  onSwitchMode: () => void;
  onSuccess: () => void;
}

export function AuthModal({ mode, isOpen, onClose, onSwitchMode, onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setError('');
    setLoading(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error?.message || (mode === 'login' ? 'Invalid email or password' : 'Something went wrong');
        setError(message);
        setLoading(false);
        return;
      }

      // Success — close modal and notify parent
      resetForm();
      onSuccess();
      onClose();
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const title = mode === 'login' ? 'Log in to Forge' : 'Create your account';
  const submitLabel = mode === 'login' ? 'Log in' : 'Sign up';
  const switchLabel = mode === 'login' ? "Don't have an account?" : 'Already have an account?';
  const switchAction = mode === 'login' ? 'Sign up' : 'Log in';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="auth-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="auth-modal-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="auth-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>

            <h2 className="auth-modal-title">{title}</h2>

            <form onSubmit={handleSubmit} className="auth-modal-form">
              <div className="auth-modal-field">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="auth-modal-input"
                />
              </div>

              <div className="auth-modal-field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="auth-modal-input"
                />
                {password.length > 0 && password.length < 8 && (
                  <span className="auth-modal-hint">Must be at least 8 characters</span>
                )}
              </div>

              {error && <div className="auth-modal-error">{error}</div>}

              <button
                type="submit"
                className="auth-modal-submit"
                disabled={loading || password.length < 8}
              >
                {loading ? 'Please wait...' : submitLabel}
              </button>
            </form>

            <div className="auth-modal-switch">
              {switchLabel}{' '}
              <button className="auth-modal-link" onClick={onSwitchMode}>
                {switchAction}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

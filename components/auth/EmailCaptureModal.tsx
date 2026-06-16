/**
 * Email capture modal — mandatory gate before download for anonymous users.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
}

export function EmailCaptureModal({ isOpen, onClose, onSubmit }: EmailCaptureModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(email);
      setEmail('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="email-capture-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="email-capture-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="email-capture-close" onClick={onClose} aria-label="Close">
              ×
            </button>

            <h2 className="email-capture-title">Enter your email to download</h2>
            <p className="email-capture-subtitle">
              We&apos;ll send you a link to edit this plan later. No spam, ever.
            </p>

            <form onSubmit={handleSubmit} className="email-capture-form">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="email-capture-input"
              />
              {error && <div className="email-capture-error">{error}</div>}
              <button
                type="submit"
                className="email-capture-submit"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Download my plan'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

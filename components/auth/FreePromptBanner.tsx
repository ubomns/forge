/**
 * Free account prompt banner — appears after 1st plan done for anonymous users.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useAuthModal } from '@/components/auth/AuthModalManager';

const DISMISS_KEY = 'forge:free-prompt-dismissed';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface FreePromptBannerProps {
  planCount: number; // Number of plans generated this session
}

export function FreePromptBanner({ planCount }: FreePromptBannerProps) {
  const { user } = useAuth();
  const { openSignup } = useAuthModal();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const age = Date.now() - parseInt(dismissedAt, 10);
      if (age < DISMISS_DURATION_MS) {
        setDismissed(true);
      } else {
        localStorage.removeItem(DISMISS_KEY);
      }
    }
  }, []);

  // Only show for anonymous users after at least 1 plan
  if (user || planCount < 1) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  return (
    <div className="free-prompt-banner">
      <p className="free-prompt-text">
        <strong>Want to save this plan?</strong> Create a free account to save up to 3 plans and edit them later.
      </p>
      <div className="free-prompt-actions">
        <button className="free-prompt-btn" onClick={openSignup}>
          Create free account
        </button>
        <button className="free-prompt-dismiss" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

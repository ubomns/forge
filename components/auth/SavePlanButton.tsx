/**
 * Save Plan button — appears in done state for authenticated users.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';

interface SavePlanButtonProps {
  planData: Record<string, unknown>;
  ideaDescription: string;
  title?: string;
}

export function SavePlanButton({ planData, ideaDescription, title }: SavePlanButtonProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title || ideaDescription.slice(0, 60),
          plan_data: planData,
          idea_description: ideaDescription,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error?.code === 'PLAN_LIMIT_REACHED') {
          setError('Free tier limited to 3 plans. Upgrade to Pro to save more.');
        } else {
          setError(data.error?.message || 'Failed to save plan');
        }
        setSaving(false);
        return;
      }

      setSaved(true);
      setSaving(false);
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  }, [user, planData, ideaDescription, title]);

  if (!user) return null;

  if (saved) {
    return <span className="save-plan-saved">Plan saved</span>;
  }

  return (
    <div className="save-plan-wrapper">
      <button
        className="save-plan-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save plan'}
      </button>
      {error && <span className="save-plan-error">{error}</span>}
    </div>
  );
}

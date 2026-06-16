import { useEffect, useReducer } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Nav } from '@/components/layout/Nav';

interface Plan {
  id: string;
  title: string;
  created_at: string;
}

type PlansAction =
  | { type: 'LOAD_SUCCESS'; plans: Plan[] }
  | { type: 'LOAD_FAILURE'; error: string }
  | { type: 'SET_LOADING' };

interface PlansState {
  plans: Plan[];
  loading: boolean;
  error: string;
}

function plansReducer(state: PlansState, action: PlansAction): PlansState {
  switch (action.type) {
    case 'LOAD_SUCCESS':
      return { plans: action.plans, loading: false, error: '' };
    case 'LOAD_FAILURE':
      return { plans: [], loading: false, error: action.error };
    case 'SET_LOADING':
      return { ...state, loading: true };
    default:
      return state;
  }
}

export default function MyPlans() {
  const { user, loading: authLoading } = useAuth();
  const [state, dispatch] = useReducer(plansReducer, {
    plans: [],
    loading: true,
    error: '',
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      dispatch({ type: 'LOAD_FAILURE', error: '' });
      return;
    }

    dispatch({ type: 'SET_LOADING' });

    fetch('/api/plans', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plans');
        return res.json();
      })
      .then((data) => {
        dispatch({ type: 'LOAD_SUCCESS', plans: data });
      })
      .catch((err) => {
        dispatch({ type: 'LOAD_FAILURE', error: err.message });
      });
  }, [user, authLoading]);

  if (authLoading || state.loading) {
    return (
      <div className="shell">
        <Nav />
        <main className="my-plans-page">
          <p className="my-plans-loading">Loading...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="shell">
        <Nav />
        <main className="my-plans-page">
          <h1>My Plans</h1>
          <p className="my-plans-empty">Please log in to view your saved plans.</p>
          <Link href="/app" className="my-plans-cta">
            Generate a plan
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <Nav />
      <main className="my-plans-page">
        <h1 className="my-plans-title">My Plans</h1>

        {state.error && <p className="my-plans-error">{state.error}</p>}

        {state.plans.length === 0 ? (
          <div className="my-plans-empty-state">
            <p className="my-plans-empty">No saved plans yet.</p>
            <Link href="/app" className="my-plans-cta">
              Generate your first plan
            </Link>
          </div>
        ) : (
          <div className="my-plans-list">
            {state.plans.map((plan) => (
              <div key={plan.id} className="my-plans-card">
                <div className="my-plans-card-content">
                  <h3 className="my-plans-card-title">{plan.title}</h3>
                  <p className="my-plans-card-date">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/app?plan_id=${plan.id}`}
                  className="my-plans-card-open"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}

        {state.plans.length >= 3 && user.tier === 'free' && (
          <div className="my-plans-upgrade">
            <p>You&apos;ve reached the 3-plan limit on the free tier.</p>
            <Link href="/pricing" className="my-plans-upgrade-btn">
              Upgrade to Pro
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

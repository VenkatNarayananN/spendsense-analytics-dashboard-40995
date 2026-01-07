import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageSection from '../components/PageSection';
import LoadingState from '../components/LoadingState';
import InlineErrorBanner from '../components/InlineErrorBanner';
import EmptyState from '../components/EmptyState';
import { getCurrentUserProfile, updateCurrentUserProfile } from '../services/backendApi';

function safeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return fallback;
}

function safeNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? n : '';
}

function toUserFacingError(e) {
  if (!e) return 'Something went wrong.';
  if (typeof e === 'string') return e;
  if (typeof e?.error === 'string') return e.error;
  return 'Something went wrong.';
}

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'EUR', label: 'EUR — Euro' },
];

// PUBLIC_INTERFACE
export default function Onboarding() {
  /** Onboarding page for collecting and saving user preferences after sign-in. */
  const navigate = useNavigate();

  const [preferredCurrency, setPreferredCurrency] = useState('USD');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [alertUnusualCharge, setAlertUnusualCharge] = useState(true);
  const [alertBudgetNearing, setAlertBudgetNearing] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const seqRef = useRef(0);

  const canSubmit = useMemo(() => {
    if (!preferredCurrency) return false;
    if (monthlyBudget === '') return true; // allow empty budget
    const n = Number(monthlyBudget);
    return Number.isFinite(n) && n >= 0;
  }, [preferredCurrency, monthlyBudget]);

  async function loadExistingPreferences({ isManualRetry = false } = {}) {
    if (isManualRetry) setLoadError(null);

    const seq = seqRef.current + 1;
    seqRef.current = seq;

    setIsLoading(true);
    const res = await getCurrentUserProfile();

    if (seqRef.current !== seq) return;

    if (!res.ok) {
      setLoadError(toUserFacingError(res));
      setIsLoading(false);
      return;
    }

    const user = res.data?.user || {};
    // These fields might not exist on the backend yet — treat missing as defaults.
    setPreferredCurrency(user.preferred_currency || 'USD');
    setMonthlyBudget(safeNumber(user.monthly_budget));
    setAlertUnusualCharge(safeBoolean(user.alert_unusual_charge, true));
    setAlertBudgetNearing(safeBoolean(user.alert_budget_nearing, true));

    setLoadError(null);
    setIsLoading(false);
  }

  useEffect(() => {
    loadExistingPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (!canSubmit) {
      setSaveError('Please check your inputs and try again.');
      return;
    }

    setIsSaving(true);
    const payload = {
      preferred_currency: preferredCurrency,
      monthly_budget: monthlyBudget === '' ? null : Number(monthlyBudget),
      alert_unusual_charge: Boolean(alertUnusualCharge),
      alert_budget_nearing: Boolean(alertBudgetNearing),
    };

    const res = await updateCurrentUserProfile(payload);

    if (!res.ok) {
      setSaveError(toUserFacingError(res));
      setIsSaving(false);
      return;
    }

    setSaveSuccess(true);
    setIsSaving(false);

    // Small delay so success message is perceivable, but keep flow snappy.
    window.setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 550);
  }

  const showBlockingError = Boolean(loadError);

  return (
    <div>
      <PageSection
        title="Welcome to SpendSense"
        subtitle="Set your preferences so we can personalize budgets and alerts."
        actions={
          <button
            type="button"
            className="btn"
            onClick={() => navigate('/dashboard')}
            disabled={isSaving}
            title="Skip onboarding and continue to dashboard"
          >
            Skip
          </button>
        }
      >
        {isLoading ? (
          <LoadingState message="Loading your preferences…" minHeight={240} />
        ) : showBlockingError ? (
          <EmptyState
            title="Could not load preferences"
            description={loadError}
            actionLabel="Retry"
            onAction={() => loadExistingPreferences({ isManualRetry: true })}
            minHeight={220}
          />
        ) : (
          <div className="grid">
            <div className="card" style={{ gridColumn: 'span 12' }}>
              {saveError ? (
                <div style={{ marginBottom: 12 }}>
                  <InlineErrorBanner
                    title="Could not save preferences"
                    description={saveError}
                    tone="warning"
                  />
                </div>
              ) : null}

              {saveSuccess ? (
                <div className="card" style={{ padding: 12, marginBottom: 12 }}>
                  <strong style={{ fontSize: 13 }}>Saved!</strong>
                  <div className="small-muted" style={{ marginTop: 6 }}>
                    Redirecting you to the dashboard…
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} aria-busy={isSaving ? 'true' : 'false'}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label className="small-muted" htmlFor="preferredCurrency" style={{ display: 'block', marginBottom: 6 }}>
                      Preferred currency
                    </label>
                    <select
                      id="preferredCurrency"
                      className="input"
                      value={preferredCurrency}
                      onChange={(ev) => setPreferredCurrency(ev.target.value)}
                      disabled={isSaving}
                    >
                      {CURRENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="small-muted" htmlFor="monthlyBudget" style={{ display: 'block', marginBottom: 6 }}>
                      Monthly budget (optional)
                    </label>
                    <input
                      id="monthlyBudget"
                      className="input"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      placeholder="e.g. 2000"
                      value={monthlyBudget}
                      onChange={(ev) => setMonthlyBudget(ev.target.value)}
                      disabled={isSaving}
                    />
                    <div className="small-muted" style={{ marginTop: 6 }}>
                      Used for budget insights and alerts.
                    </div>
                  </div>

                  <div className="card" style={{ padding: 12 }}>
                    <strong style={{ fontSize: 13 }}>Alerts</strong>
                    <div className="small-muted" style={{ marginTop: 6 }}>
                      Choose which notifications you’d like to see.
                    </div>

                    <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>Unusual charge</div>
                          <div className="small-muted">Get notified when we detect suspicious or unusual spending.</div>
                        </span>
                        <input
                          type="checkbox"
                          checked={alertUnusualCharge}
                          onChange={(ev) => setAlertUnusualCharge(ev.target.checked)}
                          disabled={isSaving}
                          aria-label="Enable unusual charge alerts"
                        />
                      </label>

                      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} aria-hidden="true" />

                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>Budget nearing limit</div>
                          <div className="small-muted">Get warned when you’re close to your monthly budget.</div>
                        </span>
                        <input
                          type="checkbox"
                          checked={alertBudgetNearing}
                          onChange={(ev) => setAlertBudgetNearing(ev.target.checked)}
                          disabled={isSaving}
                          aria-label="Enable budget nearing limit alerts"
                        />
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!canSubmit || isSaving}
                      title={!canSubmit ? 'Please check your inputs' : undefined}
                    >
                      {isSaving ? 'Saving…' : 'Save & continue'}
                    </button>
                  </div>

                  <div className="small-muted">
                    Preferences are stored on your account (via <span className="mono">/api/users/me</span>).
                    If the server doesn’t support these fields yet, you can continue and try again later.
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageSection>
    </div>
  );
}

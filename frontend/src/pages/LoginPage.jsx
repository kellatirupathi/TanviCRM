import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import Button from '../components/ui/Button.jsx';
import { Field, Input } from '../components/ui/Input.jsx';
import { Icon } from '../components/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const expired = params.get('expired');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ── Editorial brand panel ── */}
      <div className="relative hidden overflow-hidden bg-plum-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #DDBF66 0, transparent 40%), radial-gradient(circle at 80% 70%, #D49DBA 0, transparent 45%)',
          }}
        />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-plum-700/60" />
        <div className="absolute -bottom-40 -left-20 h-[28rem] w-[28rem] rounded-full border border-plum-700/40" />

        <div className="relative z-10">
          <Brand />
        </div>

        <div className="relative z-10 max-w-md">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
            Customer CRM & Analytics
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] text-white xl:text-5xl">
            Every customer,<br />every purchase,<br />
            <span className="italic text-gold-300">beautifully tracked.</span>
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-plum-100">
            Understand who your best customers are, what they love, and when they return —
            so Tanvi Boutique can style them better, every single time.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-sm text-plum-200">
          <span>Hyderabad</span>
          <span className="h-1 w-1 rounded-full bg-plum-500" />
          <span>Batch 2025–26</span>
          <span className="h-1 w-1 rounded-full bg-plum-500" />
          <span>Aurora Internship</span>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center bg-paper px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand onLight />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Admin Console
          </p>
          <h2 className="mt-2 font-display text-3xl text-ink">Sign in to continue</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Customer data is confidential. Please use your boutique credentials.
          </p>

          {expired && (
            <div className="mt-5 rounded-lg border border-gold-200 bg-gold-50 px-4 py-2.5 text-sm text-gold-800">
              Your session expired — please sign in again.
            </div>
          )}

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Email address">
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@tanviboutique.in"
                required
              />
            </Field>

            <Field label="Password">
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-muted transition hover:bg-paper-100 hover:text-plum-700"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  title={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <Icon.eyeOff className="h-4 w-4" /> : <Icon.eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                <Icon.close className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

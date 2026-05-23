import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../lib/validation';
import Spinner from '../components/Spinner';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const emailError = emailTouched && email.length > 0 && !isValidEmail(email)
    ? 'Please enter a valid email address'
    : null;

  const passwordError = passwordTouched && password.length > 0 && password.length < 6
    ? 'Password must be at least 6 characters'
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setEmailTouched(true);
      return;
    }
    if (password.length < 6) {
      setPasswordTouched(true);
      return;
    }

    setBusy(true);
    try {
      const { session } = await signUp(email, password);
      if (!session) {
        setDone(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message ?? 'Sign up failed');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-8">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-sm text-center">
          <p className="text-2xl mb-2">📬</p>
          <h2 className="text-xl font-semibold mb-2">Check your email</h2>
          <p className="text-slate-400 text-sm mb-6">
            We sent a confirmation link to <span className="text-white">{email}</span>.
            Click it to activate your account.
          </p>
          <Link to="/login" className="text-red-400 hover:text-red-300 text-sm">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-bold mb-2 text-center">
          ReLive<span className="text-red-500">TV</span>
        </h1>
        <p className="text-slate-400 text-center mb-8">Create an account</p>

        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-6 shadow-xl">
          <label className="block text-sm text-slate-400 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            disabled={busy}
            className={`w-full bg-slate-900 border rounded-lg px-4 py-2 mb-1 focus:outline-none disabled:opacity-50 transition-colors ${
              emailError
                ? 'border-red-500 focus:border-red-500'
                : 'border-slate-700 focus:border-red-500'
            }`}
          />
          <p className="text-red-400 text-xs mb-3 min-h-[1rem]">
            {emailError || '\u00A0'}
          </p>

          <label className="block text-sm text-slate-400 mb-1">Password</label>
          <div className="relative mb-1">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              disabled={busy}
              className={`w-full bg-slate-900 border rounded-lg px-4 py-2 pr-12 focus:outline-none disabled:opacity-50 transition-colors ${
                passwordError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-slate-700 focus:border-red-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-lg"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <p className={`text-xs mb-4 min-h-[1rem] ${passwordError ? 'text-red-400' : 'text-slate-500'}`}>
            {passwordError || 'At least 6 characters'}
          </p>

          {error && (
            <p className="text-red-400 text-sm mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || !email || !password || !!emailError || !!passwordError}
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Spinner size="sm" />
                <span>Creating…</span>
              </>
            ) : (
              'Sign up'
            )}
          </button>
        </form>

        <p className="text-slate-400 text-center text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-red-400 hover:text-red-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { session } = await signUp(email, password);
      // If email confirmation is enabled, session is null and user must verify
      if (!session) {
        setDone(true);
      } else {
        navigate('/tv');
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
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:border-red-500"
          />

          <label className="block text-sm text-slate-400 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 mb-1 focus:outline-none focus:border-red-500"
          />
          <p className="text-slate-500 text-xs mb-4">At least 6 characters</p>

          {error && (
            <p className="text-red-400 text-sm mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {busy ? 'Creating…' : 'Sign up'}
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
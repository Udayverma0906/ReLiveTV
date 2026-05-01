import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-6xl font-bold mb-4 tracking-tight">
        ReLive<span className="text-red-500">TV</span>
      </h1>
      <p className="text-slate-400 mb-12 text-lg">Bring back the TV experience.</p>

      {user ? (
        <>
          <p className="text-slate-300 mb-6 text-sm">
            Signed in as <span className="text-white">{user.email}</span>
          </p>
          <div className="flex gap-6 mb-6">
            <Link
              to="/tv"
              className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
            >
              📺 Open as TV
            </Link>
            <Link
              to="/remote"
              className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              📱 Open as Remote
            </Link>
          </div>
          <button
            onClick={signOut}
            className="text-slate-400 hover:text-slate-200 text-sm underline"
          >
            Sign out
          </button>
        </>
      ) : (
        <div className="flex gap-6">
          <Link
            to="/login"
            className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            Sign up
          </Link>
        </div>
      )}

      <p className="text-slate-500 mt-12 text-sm">
        Open <code className="bg-slate-800 px-2 py-1 rounded">/tv</code> on laptop,{' '}
        <code className="bg-slate-800 px-2 py-1 rounded">/remote</code> on phone.
      </p>
    </div>
  );
}
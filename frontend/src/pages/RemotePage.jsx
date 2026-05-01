import { useEffect, useState } from 'react';
import { getSessionByCode } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

export default function RemotePage() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle');  // idle | connecting | paired | error
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => disconnectSocket();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus('connecting');

    try {
      // 1. Validate code via REST first (clearer error than socket handshake)
      await getSessionByCode(code);

      // 2. Connect socket
      const socket = connectSocket({
        sessionCode: code,
        role: 'remote',
      });

      socket.on('connect_error', (err) => {
        console.error('[remote] connect_error:', err.message);
        setError(err.message);
        setStatus('error');
      });

      socket.on('paired', () => {
        console.log('[remote] paired!');
        setStatus('paired');
      });

      socket.on('peer-disconnected', ({ role }) => {
        if (role === 'tv') {
          setError('TV disconnected');
          setStatus('error');
        }
      });
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  if (status === 'paired') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-500 text-sm uppercase tracking-widest mb-4">Remote</p>
          <h1 className="text-4xl mb-4">✓ Connected</h1>
          <p className="text-slate-400">Channel buttons coming in Step 7.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="text-center w-full max-w-sm">
        <p className="text-slate-500 text-sm uppercase tracking-widest mb-4">
          ReLiveTV — Remote Mode
        </p>
        <h1 className="text-5xl font-bold mb-8">📱 Remote</h1>

        <form onSubmit={handleConnect} className="bg-slate-800 rounded-3xl p-8 shadow-2xl">
          <p className="text-slate-400 mb-4 text-sm">Enter TV code</p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCDEF"
            maxLength={6}
            autoFocus
            disabled={status === 'connecting'}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest mb-4 focus:outline-none focus:border-red-500 disabled:opacity-50"
          />

          {error && (
            <p className="text-red-400 text-sm mb-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || status === 'connecting'}
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {status === 'connecting' ? 'Connecting…' : 'Connect'}
          </button>
        </form>

        <p className="text-slate-500 mt-8 text-xs">
          Open <code className="bg-slate-800 px-2 py-1 rounded">/tv</code> on your laptop to get a code
        </p>
      </div>
    </div>
  );
}
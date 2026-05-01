import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessionByCode } from '../lib/api';
import {
  connectSocket,
  disconnectSocket,
  emitChannelChange,
  emitPowerOff,
} from '../lib/socket';

const CHANNELS = [
  { number: 1, name: 'Comedy', icon: '😂' },
  { number: 2, name: 'Crime', icon: '🔍' },
  { number: 3, name: 'News', icon: '📰' },
  { number: 4, name: 'Music', icon: '🎵' },
  { number: 5, name: 'Sports', icon: '⚽' },
];

function vibrate(ms = 30) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

export default function RemotePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | connecting | paired | error
  const [error, setError] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);

  useEffect(() => {
    return () => disconnectSocket();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    setError(null);
    setStatus('connecting');

    try {
      await getSessionByCode(code);

      const socket = connectSocket({
        sessionCode: code,
        role: 'remote',
      });

      socket.on('connect_error', (err) => {
        setError(err.message);
        setStatus('error');
      });

      socket.on('paired', () => setStatus('paired'));

      socket.on('peer-disconnected', ({ role: peerRole }) => {
        if (peerRole === 'tv') {
          setError('TV disconnected');
          setStatus('error');
        }
      });

      socket.on('tune', ({ channel }) => {
        setActiveChannel(channel.number);
      });

      socket.on('error_message', ({ message }) => {
        // Brief flash of error; not blocking
        console.warn('[remote]', message);
      });
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleChannelButton = (channelNumber) => {
    vibrate(30);
    emitChannelChange({ channel: channelNumber });
  };

  const handleChannelUp = () => {
    vibrate(30);
    emitChannelChange({ direction: 'up' });
  };

  const handleChannelDown = () => {
    vibrate(30);
    emitChannelChange({ direction: 'down' });
  };

  const handlePowerOff = () => {
    vibrate(60);
    emitPowerOff();
    disconnectSocket();
    navigate('/');
  };

  // ---- Code entry view ----
  if (status !== 'paired') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="text-center w-full max-w-sm">
          <p className="text-slate-500 text-sm uppercase tracking-widest mb-4">
            ReLiveTV — Remote
          </p>
          <h1 className="text-5xl font-bold mb-8">📱</h1>

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

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

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

  // ---- Paired remote view ----
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      {/* Physical-remote-style body */}
      <div className="w-full max-w-xs bg-gradient-to-b from-slate-700 to-slate-900 rounded-[2.5rem] p-6 shadow-2xl border border-slate-600">

        {/* Top label */}
        <div className="text-center mb-6">
          <p className="text-slate-400 text-xs uppercase tracking-widest">ReLiveTV Remote</p>
          {activeChannel && (
            <p className="text-red-400 text-xs mt-1">Channel {activeChannel}</p>
          )}
        </div>

        {/* CH+ / CH- big buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <RemoteButton onClick={handleChannelDown} variant="primary">
            <span className="text-3xl">−</span>
            <span className="text-xs mt-1">CH</span>
          </RemoteButton>
          <RemoteButton onClick={handleChannelUp} variant="primary">
            <span className="text-3xl">+</span>
            <span className="text-xs mt-1">CH</span>
          </RemoteButton>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-600 mb-6" />

        {/* Channel grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {CHANNELS.map((ch) => (
            <RemoteButton
              key={ch.number}
              onClick={() => handleChannelButton(ch.number)}
              variant={activeChannel === ch.number ? 'active' : 'channel'}
              compact
            >
              <span className="text-2xl">{ch.icon}</span>
              <span className="text-xs mt-1">{ch.number}</span>
            </RemoteButton>
          ))}
          {/* Empty slot for layout balance */}
          <div />
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-600 mb-6" />

        {/* Power */}
        <div className="flex justify-center">
          <RemoteButton onClick={handlePowerOff} variant="power">
            <span className="text-2xl">⏻</span>
            <span className="text-xs mt-1">Power</span>
          </RemoteButton>
        </div>
      </div>
    </div>
  );
}

// ---- Internal button component ----
function RemoteButton({ children, onClick, variant = 'default', compact = false }) {
  const base = `
    flex flex-col items-center justify-center
    rounded-2xl select-none touch-manipulation
    transition-all duration-150
    active:scale-95 active:shadow-inner
    ${compact ? 'py-3' : 'py-5'}
  `;

  const variants = {
    primary: 'bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white shadow-lg shadow-red-900/50',
    channel: 'bg-gradient-to-b from-slate-600 to-slate-800 hover:from-slate-500 hover:to-slate-700 text-white shadow-md',
    active: 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-900 shadow-lg shadow-amber-900/50',
    power: 'bg-gradient-to-b from-slate-700 to-black hover:from-slate-600 hover:to-slate-900 text-red-400 shadow-md w-20 h-20 rounded-full',
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}
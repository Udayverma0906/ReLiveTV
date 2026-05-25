import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessionByCode } from '../lib/api';
import {
  connectSocket,
  disconnectSocket,
  emitChannelChange,
  emitPowerOff,
  emitVolumeChange,
  emitMuteToggle,
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
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [reconnectTimer, setReconnectTimer] = useState(null);
  const [errorFlash, setErrorFlash] = useState(null);
  const [muted, setMuted] = useState(false);

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

      socket.on('paired', () => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          setReconnectTimer(null);
        }
        setStatus('paired');
      });

      socket.on('peer-disconnected', ({ role: peerRole, reconnectGraceMs }) => {
        if (peerRole === 'tv') {
          if (reconnectGraceMs) {
            setStatus('tv-reconnecting');
            const t = setTimeout(() => {
              setStatus((s) => (s === 'tv-reconnecting' ? 'error' : s));
              setError('TV disconnected');
            }, reconnectGraceMs);
            setReconnectTimer(t);
          } else {
            setError('TV disconnected');
            setStatus('error');
          }
        }
      });

      socket.on('tune', ({ channel }) => {
        setActiveChannel(channel.number);
      });

      socket.on('error_message', ({ message }) => {
        setErrorFlash(message);
        setTimeout(() => setErrorFlash(null), 3000);
      });
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleChannelButton = (n) => {
    vibrate(30);
    emitChannelChange({ channel: n });
  };

  const handleChannelUp = () => {
    vibrate(30);
    emitChannelChange({ direction: 'up' });
  };

  const handleChannelDown = () => {
    vibrate(30);
    emitChannelChange({ direction: 'down' });
  };

  const handleVolumeUp = () => {
    vibrate(20);
    emitVolumeChange({ direction: 'up' });
  };

  const handleVolumeDown = () => {
    vibrate(20);
    emitVolumeChange({ direction: 'down' });
  };

  const handleMuteToggle = () => {
    vibrate(40);
    setMuted((m) => !m);
    emitMuteToggle();
  };

  const handlePowerOff = () => {
    vibrate(60);
    emitPowerOff();
    disconnectSocket();
    navigate('/');
  };

  // ---- TV reconnecting view ----
  if (status === 'tv-reconnecting') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-3xl mb-3">📺 TV reconnecting…</h1>
          <p className="text-slate-400 text-sm animate-pulse">Hold tight</p>
        </div>
      </div>
    );
  }

  // ---- Code entry view ----
  if (status !== 'paired') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="text-center w-full max-w-sm">
          <p className="text-slate-500 text-sm uppercase tracking-widest mb-4">
            ReLiveTV — Remote
          </p>
          <h1 className="text-5xl font-bold mb-8">📱</h1>

          <form onSubmit={handleConnect} className="bg-zinc-900 rounded-3xl p-8 shadow-2xl border border-zinc-800">
            <p className="text-slate-400 mb-4 text-sm">Enter TV code</p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCDEF"
              maxLength={6}
              autoFocus
              disabled={status === 'connecting'}
              className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest mb-4 focus:outline-none focus:border-red-500 disabled:opacity-50"
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
            Open <code className="bg-zinc-800 px-2 py-1 rounded">/tv</code> on your laptop to get a code
          </p>
        </div>
      </div>
    );
  }

  // ---- Paired remote view ----
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      {/* Error flash */}
      {errorFlash && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-40">
          {errorFlash}
        </div>
      )}

      {/* Remote body — black plastic */}
      <div
        className="
          relative w-full max-w-xs
          bg-gradient-to-b from-zinc-800 via-zinc-900 to-black
          rounded-[2.5rem] p-6
          shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_40px_-10px_rgba(239,68,68,0.15)]
          border border-zinc-700
        "
      >
        {/* Top glassy highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-[2.5rem]" />

        {/* Brand label with LED */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)] animate-pulse" />
            <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">
              ReLive<span className="text-red-500">TV</span>
            </p>
          </div>
          {activeChannel && (
            <p className="text-red-400 text-xs">Now: Channel {activeChannel}</p>
          )}
        </div>

        {/* CH+/- and V+/- block */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <RemoteButton onClick={handleChannelDown} variant="primary">
            <span className="text-3xl leading-none">−</span>
            <span className="text-[10px] mt-1 font-semibold tracking-wider">CH</span>
          </RemoteButton>
          <RemoteButton onClick={handleChannelUp} variant="primary">
            <span className="text-3xl leading-none">+</span>
            <span className="text-[10px] mt-1 font-semibold tracking-wider">CH</span>
          </RemoteButton>
          <RemoteButton onClick={handleVolumeDown} variant="secondary">
            <span className="text-2xl leading-none">−</span>
            <span className="text-[10px] mt-1 font-semibold tracking-wider">VOL</span>
          </RemoteButton>
          <RemoteButton onClick={handleVolumeUp} variant="secondary">
            <span className="text-2xl leading-none">+</span>
            <span className="text-[10px] mt-1 font-semibold tracking-wider">VOL</span>
          </RemoteButton>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-5" />

        {/* Channel grid */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {CHANNELS.map((ch) => (
            <RemoteButton
              key={ch.number}
              onClick={() => handleChannelButton(ch.number)}
              variant={activeChannel === ch.number ? 'active' : 'channel'}
              compact
            >
              <span className="text-xl leading-none">{ch.icon}</span>
              <span className="text-[11px] mt-1 font-bold">{ch.number}</span>
              <span className="text-[8px] mt-0.5 opacity-70 uppercase tracking-wider">
                {ch.name}
              </span>
            </RemoteButton>
          ))}
          {/* Empty cell for grid balance */}
          <div />
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-5" />

        {/* Mute + Power */}
        <div className="grid grid-cols-2 gap-3">
          <RemoteButton onClick={handleMuteToggle} variant={muted ? 'mute-active' : 'mute'}>
            <span className="text-2xl leading-none">{muted ? '🔇' : '🔊'}</span>
            <span className="text-[10px] mt-1 font-semibold tracking-wider">
              {muted ? 'MUTED' : 'MUTE'}
            </span>
          </RemoteButton>
          <RemoteButton onClick={handlePowerOff} variant="power">
            <span className="text-2xl leading-none">📺</span>
            <span className="text-[10px] mt-1 font-semibold tracking-wider">POWER</span>
          </RemoteButton>
        </div>
      </div>
    </div>
  );
}

// ---- Internal button component ----
function RemoteButton({ children, onClick, variant = 'channel', compact = false }) {
  const base = `
    flex flex-col items-center justify-center
    rounded-2xl select-none touch-manipulation
    transition-all duration-150
    active:scale-95 active:shadow-inner
    ${compact ? 'py-2.5' : 'py-4'}
  `;

  const variants = {
    primary: 'bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white shadow-lg shadow-red-900/50 hover:shadow-red-700/60',
    secondary: 'bg-gradient-to-b from-zinc-600 to-zinc-800 hover:from-zinc-500 hover:to-zinc-700 text-white shadow-md',
    channel: 'bg-gradient-to-b from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800 text-white shadow-md border border-zinc-600',
    active: 'bg-gradient-to-b from-amber-300 to-amber-500 text-zinc-900 shadow-lg shadow-amber-700/50 border border-amber-400',
    mute: 'bg-gradient-to-b from-zinc-600 to-zinc-800 hover:from-zinc-500 hover:to-zinc-700 text-white shadow-md',
    'mute-active': 'bg-gradient-to-b from-red-700 to-red-900 text-white shadow-md shadow-red-900/60 border border-red-600',
    power: 'bg-gradient-to-b from-zinc-800 to-black hover:from-zinc-700 hover:to-zinc-900 text-red-400 hover:text-red-300 shadow-md hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] border border-zinc-700',
  };

  return (
    <button onClick={onClick} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
}
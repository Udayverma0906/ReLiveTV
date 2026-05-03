import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  createSession,
  getCurrentVideoForChannel,
  markVideoBroken,
} from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';
import YouTubePlayer from '../components/YouTubePlayer';
import ChannelBadge from '../components/ChannelBadge';
import CrtOverlay from '../components/CrtOverlay';

const SESSION_KEY = 'rlt-tv-session';
const IDLE_MS = 2 * 60 * 60 * 1000;
const PROMPT_GRACE_MS = 30 * 1000;

export default function TvPage() {
  const [code, setCode] = useState(null);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [badgeKey, setBadgeKey] = useState(0);
  const [idlePrompt, setIdlePrompt] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(70);

  const channelRef = useRef(null);
  const idleTimerRef = useRef(null);
  const promptTimerRef = useRef(null);
  const playerRef = useRef(null);

  const [crtEnabled, setCrtEnabled] = useState(() => {
    return localStorage.getItem('rlt-crt') !== 'off';
  });

  const toggleCrt = () => {
    const next = !crtEnabled;
    setCrtEnabled(next);
    localStorage.setItem('rlt-crt', next ? 'on' : 'off');
  };

  // ---- Idle timer management ----
  const resetIdleTimer = () => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(promptTimerRef.current);
    setIdlePrompt(false);

    idleTimerRef.current = setTimeout(() => {
      setIdlePrompt(true);
      promptTimerRef.current = setTimeout(() => {
        disconnectSocket();
        localStorage.removeItem(SESSION_KEY);
        setIdlePrompt(false);
        setStatus('idle-disconnected');
      }, PROMPT_GRACE_MS);
    }, IDLE_MS);
  };

  const dismissIdlePrompt = () => resetIdleTimer();

  // ---- Tune to a channel ----
  const tune = async (channelNumber) => {
    try {
      const data = await getCurrentVideoForChannel(channelNumber);
      setCurrentChannel(data.channel);
      setCurrentVideo({
        youtubeId: data.video.youtubeId,
        title: data.video.title,
        offsetSec: data.offsetSec,
      });
      channelRef.current = data.channel;
      setBadgeKey((k) => k + 1);
    } catch (err) {
      console.error('[tv] tune failed:', err);
      setError(err.message);
    }
  };

  // ---- Session + socket setup ----
  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        let session;

        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const res = await fetch(
              `${import.meta.env.VITE_API_URL}/api/sessions/${parsed.code}`
            );
            if (res.ok) {
              session = parsed;
            } else {
              localStorage.removeItem(SESSION_KEY);
            }
          } catch {
            localStorage.removeItem(SESSION_KEY);
          }
        }

        if (!session) {
          session = await createSession();
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }

        if (!mounted) return;
        setCode(session.code);
        setStatus('waiting');

        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        const socket = connectSocket({
          sessionCode: session.code,
          role: 'tv',
          token: authSession?.access_token,
        });

        socket.on('connect_error', (err) => {
          if (mounted) {
            setError(err.message);
            setStatus('error');
          }
        });

        socket.on('paired', async () => {
          if (!mounted) return;
          setStatus('paired');
          resetIdleTimer();
          if (!channelRef.current) {
            await tune(1);
          }
        });

        socket.on('peer-disconnected', ({ role }) => {
          if (mounted && role === 'remote') {
            setStatus('waiting');
          }
        });

        socket.on('tune', ({ channel, video, offsetSec }) => {
          if (!mounted) return;
          setCurrentChannel(channel);
          setCurrentVideo({
            youtubeId: video.youtubeId,
            title: video.title,
            offsetSec,
          });
          channelRef.current = channel;
          setBadgeKey((k) => k + 1);
          resetIdleTimer();
        });

        // Volume control from Remote
        socket.on('volume_change', ({ direction }) => {
          if (!mounted || !playerRef.current) return;
          const player = playerRef.current;
          const current = typeof player.getVolume === 'function' ? player.getVolume() : volume;
          const next = direction === 'up'
            ? Math.min(100, current + 10)
            : Math.max(0, current - 10);
          player.setVolume(next);
          setVolume(next);
          if (next > 0 && muted) {
            player.unMute();
            setMuted(false);
          }
        });

        socket.on('mute_toggle', () => {
          if (!mounted || !playerRef.current) return;
          const player = playerRef.current;
          if (player.isMuted && player.isMuted()) {
            player.unMute();
            setMuted(false);
          } else {
            player.mute();
            setMuted(true);
          }
        });
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setStatus('error');
        }
      }
    }

    setup();

    return () => {
      mounted = false;
      disconnectSocket();
      clearTimeout(idleTimerRef.current);
      clearTimeout(promptTimerRef.current);
    };
  }, []);

  // ---- Video lifecycle ----
  const handleVideoEnded = async () => {
    const ch = channelRef.current;
    if (ch) await tune(ch.number);
  };

  const handleVideoError = async (errorCode) => {
    const ch = channelRef.current;
    const broken = currentVideo;
    if (broken && ch) {
      await markVideoBroken(ch.number, broken.youtubeId, errorCode);
      await tune(ch.number);
    }
  };

  // Capture player ref when YouTubePlayer reports ready
  const handlePlayerReady = (player) => {
    playerRef.current = player;
    if (typeof player.setVolume === 'function') {
      player.setVolume(volume);
    }
  };

  // ---- Render ----
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Non-paired full-screen states */}
      {status !== 'paired' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-slate-500 text-sm uppercase tracking-widest mb-4">
            ReLiveTV — Screen Mode
          </p>

          {status === 'initializing' && (
            <h1 className="text-3xl text-slate-400">Starting up…</h1>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-3xl text-red-500 mb-2">Something went wrong</h1>
              <p className="text-slate-400">{error}</p>
            </>
          )}

          {status === 'idle-disconnected' && (
            <>
              <h1 className="text-3xl text-slate-300 mb-2">Session ended</h1>
              <p className="text-slate-500">Refresh the page to start a new one.</p>
            </>
          )}

          {status === 'waiting' && code && (
            <>
              <h1 className="text-2xl mb-6">Connect your phone as a remote</h1>
              <p className="text-slate-400 mb-4 text-sm">
                Open this site on your phone and enter:
              </p>
              <div className="bg-slate-800 px-12 py-8 rounded-2xl mb-6">
                <p className="text-6xl font-mono tracking-widest">{code}</p>
              </div>
              <p className="text-slate-500 text-xs animate-pulse">
                Waiting for remote…
              </p>
            </>
          )}
        </div>
      )}

      {/* Paired state — TV-bezeled player */}
      {status === 'paired' && currentVideo && (
        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
          {/* TV body (plastic bezel) */}
          <div
            className="
              relative w-full max-w-7xl aspect-video
              bg-gradient-to-b from-slate-800 via-slate-900 to-black
              rounded-[2rem] sm:rounded-[3rem]
              p-4 sm:p-8
              shadow-[0_30px_80px_-15px_rgba(233,69,96,0.25),0_0_0_1px_rgba(255,255,255,0.05)]
              border border-slate-700
            "
          >
            {/* Inner screen with inset shadow */}
            <div
              className="
                relative w-full h-full
                rounded-2xl overflow-hidden
                bg-black
                shadow-[inset_0_0_40px_rgba(0,0,0,0.9),inset_0_0_8px_rgba(255,255,255,0.05)]
                ring-1 ring-slate-950
              "
            >
              <YouTubePlayer
                videoId={currentVideo.youtubeId}
                startSeconds={currentVideo.offsetSec}
                onEnded={handleVideoEnded}
                onError={handleVideoError}
                onReady={handlePlayerReady}
              />
              <CrtOverlay enabled={crtEnabled} />

              {/* Mute indicator */}
              {muted && (
                <div className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur-sm border border-red-500 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-red-500 text-lg">🔇</span>
                  <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Muted</span>
                </div>
              )}

              {currentChannel && (
                <ChannelBadge
                  key={badgeKey}
                  number={currentChannel.number}
                  name={currentChannel.name}
                />
              )}
            </div>

            {/* Brand label below screen */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-center">
              <p className="text-slate-600 text-[10px] sm:text-xs font-bold tracking-[0.3em] uppercase">
                ReLive<span className="text-red-500">TV</span>
              </p>
            </div>

            {/* Power LED */}
            <div className="absolute bottom-3 right-6 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse" />
          </div>

          {/* CRT toggle — floating outside the TV */}
          <button
            onClick={toggleCrt}
            className="absolute bottom-4 right-4 z-30 text-slate-700 hover:text-slate-400 text-xs transition-colors"
          >
            CRT: {crtEnabled ? 'on' : 'off'}
          </button>
        </div>
      )}

      {/* Tuning placeholder */}
      {status === 'paired' && !currentVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-400">Tuning in…</p>
        </div>
      )}

      {/* Idle prompt */}
      {idlePrompt && (
        <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md text-center mx-4">
            <h2 className="text-3xl font-bold mb-4">Are you still watching?</h2>
            <p className="text-slate-400 mb-6">
              Use your remote or click below to keep watching.
            </p>
            <button
              onClick={dismissIdlePrompt}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Yes, keep watching
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
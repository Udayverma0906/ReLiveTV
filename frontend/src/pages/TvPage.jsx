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

// Idle timing — for testing, drop these to seconds
const IDLE_MS = 30 * 1000;     // 2 hours of no input → show prompt
const PROMPT_GRACE_MS = 30 * 1000;       // 30s to respond before hard disconnect

export default function TvPage() {
  const [code, setCode] = useState(null);
  const [status, setStatus] = useState('initializing');
  // Possible statuses:
  // initializing | waiting | paired | idle-disconnected | error

  const [error, setError] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [badgeKey, setBadgeKey] = useState(0);
  const [idlePrompt, setIdlePrompt] = useState(false);

  const channelRef = useRef(null);
  const idleTimerRef = useRef(null);
  const promptTimerRef = useRef(null);

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
        // Hard timeout — user didn't respond, end the session
        disconnectSocket();
        localStorage.removeItem(SESSION_KEY);
        setIdlePrompt(false);
        setStatus('idle-disconnected');
      }, PROMPT_GRACE_MS);
    }, IDLE_MS);
  };

  const dismissIdlePrompt = () => {
    resetIdleTimer();
  };

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

        // Try to resume an existing session from localStorage
        const stored = localStorage.getItem(SESSION_KEY);
        console.log('[tv] stored session in localStorage:', stored);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            console.log('[tv] stored session in localStorage:', stored);
            const res = await fetch(
              `${import.meta.env.VITE_API_URL}/api/sessions/${parsed.code}`
            );
            console.log('[tv] validation response:', res.status);
            if (res.ok) {
              session = parsed;
              console.log('[tv] REUSING session:', session.code);
              
            } else {
                console.log('[tv] stored session invalid, removing');
              localStorage.removeItem(SESSION_KEY);
            }
          } catch (err) {
            console.log('[tv] error during validation:', err);
            localStorage.removeItem(SESSION_KEY);
          }
        }

        // No valid existing session → create a new one
        if (!session) {
          console.log('[tv] CREATING new session');
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
          console.error('[tv] connect_error:', err.message);
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
      } catch (err) {
        console.error('[tv] setup failed:', err);
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

  // ---- Video lifecycle handlers ----
  const handleVideoEnded = async () => {
    const ch = channelRef.current;
    if (ch) await tune(ch.number);
  };

  const handleVideoError = async (errorCode) => {
    const ch = channelRef.current;
    const broken = currentVideo;
    if (broken && ch) {
      console.warn(
        `[tv] video ${broken.youtubeId} broken (${errorCode}), skipping`
      );
      await markVideoBroken(ch.number, broken.youtubeId, errorCode);
      await tune(ch.number);
    }
  };

  // ---- Render ----
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Initializing / Error / Waiting / Idle-disconnected (full-screen states) */}
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

      {/* Paired state with video — full player + overlays */}
      {status === 'paired' && currentVideo && (
        <>
          <YouTubePlayer
            videoId={currentVideo.youtubeId}
            startSeconds={currentVideo.offsetSec}
            onEnded={handleVideoEnded}
            onError={handleVideoError}
          />
          <CrtOverlay enabled={crtEnabled} />
          {currentChannel && (
            <ChannelBadge
              key={badgeKey}
              number={currentChannel.number}
              name={currentChannel.name}
            />
          )}

          {/* Subtle CRT toggle in corner */}
          <button
            onClick={toggleCrt}
            className="absolute bottom-4 right-4 z-30 text-slate-600 hover:text-slate-300 text-xs"
          >
            CRT: {crtEnabled ? 'on' : 'off'}
          </button>
        </>
      )}

      {/* Paired but still loading first video */}
      {status === 'paired' && !currentVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-400">Tuning in…</p>
        </div>
      )}

      {/* Idle prompt overlay (shown above everything when idle hits) */}
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
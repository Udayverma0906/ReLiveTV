import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { createSession, getCurrentVideoForChannel, markVideoBroken } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';
import YouTubePlayer from '../components/YouTubePlayer';
import ChannelBadge from '../components/ChannelBadge';

export default function TvPage() {
  const [code, setCode] = useState(null);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null); // {number, name}
  const [currentVideo, setCurrentVideo] = useState(null);     // {youtubeId, title, offsetSec}
  const [badgeKey, setBadgeKey] = useState(0);                // bump to retrigger animation

  const channelRef = useRef(null); // for use in async handlers

  // Fetch current video for a given channel number
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
      setBadgeKey((k) => k + 1); // retrigger badge animation
    } catch (err) {
      console.error('[tv] tune failed:', err);
      setError(err.message);
    }
  };

  // Setup session + socket
  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        const session = await createSession();
        if (!mounted) return;
        setCode(session.code);
        setStatus('waiting');

        const { data: { session: authSession } } = await supabase.auth.getSession();

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
          // Default to channel 1 on first pair
          await tune(1);
        });

        socket.on('peer-disconnected', ({ role }) => {
          if (mounted && role === 'remote') setStatus('waiting');
        });

        // Step 7 will add: socket.on('channel_change', ({ channel }) => tune(channel));
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
    };
  }, []);

  // When current video ends naturally, fetch the next one
  const handleVideoEnded = async () => {
    const ch = channelRef.current;
    if (ch) await tune(ch.number);
  };

  // When YouTube reports embed error, mark broken and skip
  const handleVideoError = async (errorCode) => {
    const ch = channelRef.current;
    const broken = currentVideo;
    if (broken && ch) {
      console.warn(`[tv] video ${broken.youtubeId} broken (${errorCode}), skipping`);
      await markVideoBroken(ch.number, broken.youtubeId, errorCode);
      await tune(ch.number);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Initializing / Error / Waiting states */}
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

          {status === 'waiting' && code && (
            <>
              <h1 className="text-2xl mb-6">Connect your phone as a remote</h1>
              <p className="text-slate-400 mb-4 text-sm">Open this site on your phone and enter:</p>
              <div className="bg-slate-800 px-12 py-8 rounded-2xl mb-6">
                <p className="text-6xl font-mono tracking-widest">{code}</p>
              </div>
              <p className="text-slate-500 text-xs animate-pulse">Waiting for remote…</p>
            </>
          )}
        </div>
      )}

      {/* Paired state - show the player */}
      {status === 'paired' && currentVideo && (
        <>
          <YouTubePlayer
            videoId={currentVideo.youtubeId}
            startSeconds={currentVideo.offsetSec}
            onEnded={handleVideoEnded}
            onError={handleVideoError}
          />
          {currentChannel && (
            <ChannelBadge
              key={badgeKey}
              number={currentChannel.number}
              name={currentChannel.name}
            />
          )}
        </>
      )}

      {/* Loading current video */}
      {status === 'paired' && !currentVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-400">Tuning in…</p>
        </div>
      )}
    </div>
  );
}
import { useEffect, useRef } from 'react';
import { loadYouTubeAPI } from '../lib/youtube';

/**
 * Embeds a YouTube video with controls hidden.
 *
 * Props:
 *   videoId       - YouTube video ID (e.g. "dQw4w9WgXcQ")
 *   startSeconds  - Where to start playback (computed offset for "live" feel)
 *   onEnded       - Called when video ends
 *   onError       - Called with error code (101, 150, etc.)
 *   onReady       - Called when player is ready (optional)
 */
export default function YouTubePlayer({
  videoId,
  startSeconds = 0,
  onEnded,
  onError,
  onReady,
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const callbacksRef = useRef({ onEnded, onError, onReady });

  // Keep callback ref fresh without re-creating the player
  useEffect(() => {
    callbacksRef.current = { onEnded, onError, onReady };
  }, [onEnded, onError, onReady]);

  // Create player once on mount
  useEffect(() => {
    let mounted = true;
    let player = null;

    loadYouTubeAPI().then((YT) => {
      if (!mounted || !containerRef.current) return;

      player = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,           // hide play/pause/scrub
          disablekb: 1,          // ignore keyboard shortcuts
          fs: 0,                 // hide fullscreen button
          iv_load_policy: 3,     // hide annotations
          modestbranding: 1,     // smaller YouTube logo
          rel: 0,                // no related videos at end
          start: startSeconds,
          playsinline: 1,        // iOS: don't go fullscreen on play
        },
        events: {
          onReady: () => callbacksRef.current.onReady?.(player),
          onStateChange: (e) => {
            // YT.PlayerState.ENDED === 0
            if (e.data === 0) callbacksRef.current.onEnded?.();
          },
          onError: (e) => callbacksRef.current.onError?.(e.data),
        },
      });

      playerRef.current = player;
    });

    return () => {
      mounted = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Player may not be fully initialized yet
        }
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // create once, never recreate

  // Update video without recreating the player
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !player.loadVideoById) return;
    if (!videoId) return;

    player.loadVideoById({
      videoId,
      startSeconds,
    });
  }, [videoId, startSeconds]);

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* The actual iframe gets injected here */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Click-blocker overlay - prevents user from pausing/scrubbing */}
      <div className="absolute inset-0 z-10 cursor-default" />
    </div>
  );
}
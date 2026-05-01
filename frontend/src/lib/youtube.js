/**
 * Load YouTube IFrame API once and return the global YT object.
 * Subsequent calls return the cached promise.
 */
let ytPromise = null;

export function loadYouTubeAPI() {
  if (ytPromise) return ytPromise;

  ytPromise = new Promise((resolve) => {
    // If already loaded (e.g., via another tab in dev), use it directly
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    // YouTube calls this global function when its script finishes loading
    window.onYouTubeIframeAPIReady = () => {
      resolve(window.YT);
    };

    // Inject the script tag
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
  });

  return ytPromise;
}
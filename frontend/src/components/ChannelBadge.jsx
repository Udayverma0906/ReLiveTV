import { useEffect, useState } from 'react';

/**
 * Channel badge that fades in on mount, holds, then fades out.
 * Uses key prop on the parent to retrigger animation on channel change.
 */
export default function ChannelBadge({ number, name }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hold visible for 2.5s, then start fade
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`
        absolute top-8 right-8 z-20
        bg-black/70 backdrop-blur-sm
        border-2 border-red-500
        rounded-lg px-6 py-4
        transition-opacity duration-700
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <p className="text-red-500 text-sm font-bold uppercase tracking-widest">
        Channel {number}
      </p>
      <p className="text-white text-xl font-bold mt-1">{name}</p>
    </div>
  );
}
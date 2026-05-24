export default function VolumeBadge({ volume, muted }) {
  const segments = Array.from({ length: 10 }, (_, i) => i);
  const activeSegments = muted ? 0 : Math.round(volume / 10);

  return (
    <div
      className="
        absolute top-4 left-1/2 -translate-x-1/2 z-20
        bg-black/80 backdrop-blur-sm border border-red-500 rounded-xl
        px-5 py-3 animate-volume-badge
      "
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{muted ? '🔇' : volume > 0 ? '🔊' : '🔈'}</span>
        <div className="flex items-center gap-1">
          {segments.map((i) => (
            <div
              key={i}
              className={`
                w-1.5 h-4 rounded-sm transition-colors
                ${i < activeSegments ? 'bg-red-500' : 'bg-zinc-700'}
              `}
            />
          ))}
        </div>
        <span className="text-white text-sm font-bold ml-1 tabular-nums">
          {muted ? 'MUTED' : volume}
        </span>
      </div>
    </div>
  );
}
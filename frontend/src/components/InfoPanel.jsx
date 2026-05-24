

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

export default function InfoPanel({ channel, currentTitle, currentEndTime, next }) {

  return (
    <div
className={`
  absolute bottom-4 left-4 z-20
  bg-black/85 backdrop-blur-md
  border border-red-500/40 rounded-xl
  overflow-hidden
  max-w-md
  animate-info-panel
`}
    >
      {/* Channel header */}
      <div className="bg-red-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5">
        Channel {channel.number} · {channel.name}
      </div>

      {/* Current entry */}
      <div className="px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-red-400 text-xs font-bold uppercase tracking-wider min-w-[40px]">
            Now
          </span>
          <p className="text-white text-sm font-semibold truncate flex-1">
            {currentTitle}
          </p>
        </div>
        {currentEndTime && (
          <p className="text-slate-400 text-xs ml-[52px] mt-0.5">
            until {formatTime(currentEndTime)}
          </p>
        )}
      </div>

      {/* Next entry (if available) */}
      {next && (
        <>
          <div className="border-t border-zinc-700/50" />
          <div className="px-4 py-3">
            <div className="flex items-baseline gap-3">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider min-w-[40px]">
                Next
              </span>
              <p className="text-slate-200 text-sm truncate flex-1">
                {next.title}
              </p>
            </div>
            <p className="text-slate-500 text-xs ml-[52px] mt-0.5">
              {formatTime(next.startTime)} – {formatTime(next.endTime)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
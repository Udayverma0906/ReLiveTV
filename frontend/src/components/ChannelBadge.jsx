export default function ChannelBadge({ number, name }) {
  return (
    <div
      className="
        absolute top-8 right-8 z-20
        bg-black/70 backdrop-blur-sm
        border-2 border-red-500
        rounded-lg px-6 py-4
        animate-channel-badge
      "
    >
      <p className="text-red-500 text-sm font-bold uppercase tracking-widest">
        Channel {number}
      </p>
      <p className="text-white text-xl font-bold mt-1">{name}</p>
    </div>
  );
}
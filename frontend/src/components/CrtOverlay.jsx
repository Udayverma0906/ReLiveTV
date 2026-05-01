export default function CrtOverlay({ enabled }) {
  if (!enabled) return null;

  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none"
      style={{
        background: `
          repeating-linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.15) 0px,
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 3px
          )
        `,
        mixBlendMode: 'multiply',
      }}
    />
  );
}
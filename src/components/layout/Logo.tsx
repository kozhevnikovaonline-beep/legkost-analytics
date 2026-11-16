/** Фирменный знак: розовый шар с лепестком, как в Mini App */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="shrink-0 drop-shadow-[0_6px_18px_rgba(255,46,138,0.55)]">
      <defs>
        <radialGradient id="logo-g" cx="32%" cy="28%" r="80%">
          <stop offset="0" stopColor="#FFB3D3" />
          <stop offset=".25" stopColor="#FF5FA2" />
          <stop offset=".6" stopColor="#DB1068" />
          <stop offset="1" stopColor="#7D0839" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#logo-g)" />
      <path d="M19.5 44.5c0-12 7.2-20 23-21.6-1.6 13.6-9.6 20.8-23 21.6zM19.5 44.5l9.6-9.6" fill="none" stroke="#fff" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

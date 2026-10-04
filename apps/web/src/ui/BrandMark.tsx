/** The app icon (same artwork as public/icon.svg) for in-app use. Decorative: the app name always sits beside it. */
export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 512 512" width={size} height={size} className={className}>
      <rect width="512" height="512" rx="112" fill="#1f4fd8" />
      <g transform="rotate(-35 256 256)">
        <circle cx="170" cy="368" r="48" fill="none" stroke="#fff" strokeWidth="30" />
        <circle cx="342" cy="368" r="48" fill="none" stroke="#fff" strokeWidth="30" />
        <path d="M196 328 L330 110 M316 328 L182 110" stroke="#fff" strokeWidth="32" strokeLinecap="round" />
        <circle cx="256" cy="232" r="12" fill="#1f4fd8" />
      </g>
    </svg>
  );
}

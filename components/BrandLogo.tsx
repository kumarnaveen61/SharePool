/**
 * SharePool brand mark — interlocking rings forming a "pool" of
 * connected circles. Three overlapping circles arranged in a triangle,
 * stroked in gold. Reads as "trusted network / shared space".
 */
export function BrandLogo({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`grid place-items-center rounded-xl border border-border bg-card ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          width: size * 0.6,
          height: size * 0.6,
        }}
        className="text-gold"
        aria-hidden
      >
        {/* Top circle */}
        <circle cx="16" cy="9" r="5.5" />
        {/* Bottom-left circle */}
        <circle cx="9.5" cy="21" r="5.5" />
        {/* Bottom-right circle */}
        <circle cx="22.5" cy="21" r="5.5" />
      </svg>
    </div>
  );
}

/** Small inline variant — just the rings, no tile background. */
export function BrandMark({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size }}
      className={className}
      aria-hidden
    >
      <circle cx="16" cy="9" r="5.5" />
      <circle cx="9.5" cy="21" r="5.5" />
      <circle cx="22.5" cy="21" r="5.5" />
    </svg>
  );
}
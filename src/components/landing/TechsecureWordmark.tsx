interface Props {
  className?: string;
  showTagline?: boolean;
}

/**
 * Inline SVG wordmark for TechSecure AI, rendered in pure white so it sits
 * cleanly over the dark landing background.
 */
export function TechsecureWordmark({ className, showTagline = false }: Props) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 220 40"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Techsecure AI"
        className="h-7 w-auto"
      >
        <defs>
          <linearGradient id="ts-shield" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path
          d="M16 4 L28 9 L28 20 C28 27 22 33 16 36 C10 33 4 27 4 20 L4 9 Z"
          fill="none"
          stroke="url(#ts-shield)"
          strokeWidth="1.8"
        />
        <path
          d="M11 20 L15 24 L22 16"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="40"
          y="26"
          fill="#ffffff"
          fontFamily="'Space Grotesk', system-ui, sans-serif"
          fontWeight="700"
          fontSize="20"
          letterSpacing="-0.5"
        >
          Techsecure
        </text>
        <text
          x="170"
          y="26"
          fill="#ffffff"
          fillOpacity="0.6"
          fontFamily="'Space Grotesk', system-ui, sans-serif"
          fontWeight="500"
          fontSize="20"
          letterSpacing="-0.5"
        >
          AI
        </text>
      </svg>
      {showTagline && (
        <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-white/50">
          Security, by design.
        </p>
      )}
    </div>
  );
}
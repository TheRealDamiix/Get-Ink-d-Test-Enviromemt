import React, { useId } from 'react';

interface InkSnapLogoProps {
  className?: string;
}

/**
 * InkSnap SVG logo — ink drop with a camera aperture inside.
 * Uses useId() so multiple instances on the same page don't conflict on the gradient id.
 */
const InkSnapLogo: React.FC<InkSnapLogoProps> = ({ className = 'w-10 h-10' }) => {
  const uid = useId();
  const gradId = `inksnap-grad-${uid}`;
  const glowId = `inksnap-glow-${uid}`;

  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="InkSnap"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e53e3e" />
          <stop offset="65%" stopColor="#c00000" />
          <stop offset="100%" stopColor="#8B0000" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ink drop body — pointed at top, round at bottom */}
      <path
        d="M20 3 C20 3 8 17 8 25 C8 32.73 13.37 38 20 38 C26.63 38 32 32.73 32 25 C32 17 20 3 20 3Z"
        fill={`url(#${gradId})`}
        filter={`url(#${glowId})`}
      />

      {/* Camera aperture outer ring — white */}
      <circle cx="20" cy="25" r="7.5" fill="rgba(255,255,255,0.95)" />

      {/* Camera aperture inner dot — red gradient */}
      <circle cx="20" cy="25" r="4.5" fill={`url(#${gradId})`} />

      {/* Specular highlight */}
      <circle cx="17.5" cy="22.5" r="1.8" fill="rgba(255,255,255,0.75)" />
    </svg>
  );
};

export default InkSnapLogo;

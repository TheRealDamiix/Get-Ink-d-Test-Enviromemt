import React, { useState, useId } from 'react';

interface InkSnapLogoProps {
  className?: string;
}

/**
 * InkSnap logo — shows /public/inksnap-logo.png when available,
 * falls back to the built-in SVG ink-drop if the PNG hasn't been saved yet.
 */
const InkSnapLogo: React.FC<InkSnapLogoProps> = ({ className = 'w-10 h-10' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const uid = useId();
  const gradId = `inksnap-grad-${uid}`;
  const glowId = `inksnap-glow-${uid}`;

  if (!imgFailed) {
    return (
      <img
        src="/inksnap-logo.png"
        alt="InkSnap"
        className={`${className} object-contain`}
        onError={() => setImgFailed(true)}
      />
    );
  }

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
      <path
        d="M20 3 C20 3 8 17 8 25 C8 32.73 13.37 38 20 38 C26.63 38 32 32.73 32 25 C32 17 20 3 20 3Z"
        fill={`url(#${gradId})`}
        filter={`url(#${glowId})`}
      />
      <circle cx="20" cy="25" r="7.5" fill="rgba(255,255,255,0.95)" />
      <circle cx="20" cy="25" r="4.5" fill={`url(#${gradId})`} />
      <circle cx="17.5" cy="22.5" r="1.8" fill="rgba(255,255,255,0.75)" />
    </svg>
  );
};

export default InkSnapLogo;

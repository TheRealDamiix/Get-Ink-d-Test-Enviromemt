import React from 'react';

interface InkSnapLogoProps {
  className?: string;
}

/**
 * InkSnap logo — renders the PNG asset from /public/inksnap-logo.png.
 * Place the logo file at: public/inksnap-logo.png
 */
const InkSnapLogo: React.FC<InkSnapLogoProps> = ({ className = 'w-10 h-10' }) => (
  <img
    src="/inksnap-logo.png"
    alt="InkSnap"
    className={`${className} object-contain`}
  />
);

export default InkSnapLogo;

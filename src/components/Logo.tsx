import React from 'react';
import logoUrl from '../assets/logo.png';
import logoFullUrl from '../assets/logo-full.png';

interface LogoProps {
  className?: string;
  style?: React.CSSProperties;
  full?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8", style, full = false }) => (
  <img 
    src={full ? logoFullUrl : logoUrl} 
    alt="BioQR Logo" 
    className={className} 
    style={{ objectFit: 'contain', ...style }} 
  />
);

export default Logo;


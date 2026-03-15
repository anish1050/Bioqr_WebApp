import React from 'react';
import logoUrl from '../assets/logo.png';

interface LogoProps {
  className?: string;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8", style }) => (
  <img 
    src={logoUrl} 
    alt="BioQR Logo" 
    className={className} 
    style={{ borderRadius: '50%', objectFit: 'cover', ...style }} 
  />
);

export default Logo;


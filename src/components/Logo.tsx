import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8" }) => (
  <svg 
    className={className} 
    viewBox="0 0 100 100" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4F46E5" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
    <path 
      d="M50 5 L85 20 V45 C85 65 70 85 50 95 C30 85 15 65 15 45 V20 L50 5Z" 
      fill="url(#logo-gradient)" 
      stroke="#06B6D4" 
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <rect height="12" rx="2" width="12" x="30" y="30" fill="white" />
    <rect height="12" rx="2" width="12" x="58" y="30" fill="white" />
    <rect height="12" rx="2" width="12" x="30" y="58" fill="white" />
    <path 
      d="M50 40 Q60 40 60 50 T50 60 T40 50 T50 40 M50 35 Q65 35 65 50 T50 65 T35 50 T50 35" 
      fill="none" 
      stroke="white" 
      strokeLinecap="round" 
      strokeWidth="2"
    />
    <circle cx="50" cy="50" r="2" fill="white" />
  </svg>
);

export default Logo;

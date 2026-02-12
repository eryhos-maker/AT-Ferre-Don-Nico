import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-16" }) => {
  return (
    <svg 
      viewBox="0 0 380 150" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo Ferre Don Nico"
    >
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="3" dy="3" stdDeviation="2" floodOpacity="0.2"/>
        </filter>
        <filter id="inner-highlight" x="-50%" y="-50%" width="200%" height="200%">
           <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
           </feComponentTransfer>
        </filter>
      </defs>

      {/* Group 1: Ferre (Red Bubble) */}
      {/* Rotated for dynamic effect */}
      <g transform="rotate(-5, 100, 75)">
        {/* White outline for separation */}
        <path 
          d="M20 25 L190 15 L180 95 L110 100 L90 130 L75 105 L25 100 Z" 
          fill="white" 
          stroke="white" 
          strokeWidth="8"
          strokeLinejoin="round"
        />
        
        {/* Red Fill */}
        <path 
          d="M20 25 L190 15 L180 95 L110 100 L90 130 L75 105 L25 100 Z" 
          fill="#DC2626" 
          filter="url(#shadow)"
          stroke="#DC2626"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        
        {/* Text */}
        <text 
          x="105" 
          y="75" 
          fill="white" 
          fontFamily="'Arial Black', 'Helvetica Neue', sans-serif" 
          fontWeight="900" 
          fontSize="58" 
          textAnchor="middle"
          letterSpacing="-2"
          style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.15)' }}
        >
          Ferre
        </text>
      </g>

      {/* Group 2: Don Nico (Blue Banner) */}
      <g transform="translate(15, 15)">
        {/* White outline */}
        <path 
          d="M130 65 L360 65 L345 125 L145 125 Z" 
          fill="white" 
          stroke="white" 
          strokeWidth="8" 
          strokeLinejoin="round"
        />
        
        {/* Blue Fill */}
        <path 
          d="M130 65 L360 65 L345 125 L145 125 Z" 
          fill="#1E40AF" 
          filter="url(#shadow)"
          stroke="#1E40AF"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        
        {/* Text */}
        <text 
          x="245" 
          y="108" 
          fill="white" 
          fontFamily="'Arial Black', 'Helvetica Neue', sans-serif" 
          fontWeight="900" 
          fontSize="44" 
          textAnchor="middle"
          letterSpacing="-1"
          style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.15)' }}
        >
          Don Nico
        </text>
      </g>
    </svg>
  );
};

export default Logo;
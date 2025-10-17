import React from 'react';

const Logo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 300 80"
    className={className}
    aria-label="Keys for Everyday Heroes"
  >
    <defs>
      <style>
        {`.logo-text { font-family: system-ui, sans-serif; font-weight: 700; fill: white; text-anchor: middle; }`}
      </style>
    </defs>
    
    <text x="150" y="35" className="logo-text" fontSize="28">Keys for</text>
    <text x="150" y="68" className="logo-text" fontSize="28">Everyday Heroes</text>
  </svg>
);

export default Logo;

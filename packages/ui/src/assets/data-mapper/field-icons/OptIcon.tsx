import React from 'react';

const OptIcon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(({ ...rest }, ref) => (
  <svg
    ref={ref}
    width="4.2em"
    height="2.2em"
    viewBox="0 0 35 18"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...rest}
  >
    <rect x="1" y="1" width="33" height="16.4" rx="5" fill="none" stroke="currentColor" strokeWidth="1" />
    <text
      x="50%"
      y="59%"
      dominantBaseline="middle"
      textAnchor="middle"
      fontFamily="IBM Plex Mono, monospace"
      fontSize="10"
      fontWeight="700"
    >
      Opt
    </text>
  </svg>
));

export default OptIcon;

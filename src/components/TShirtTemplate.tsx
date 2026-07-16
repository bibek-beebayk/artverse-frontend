import { cn } from '../lib/utils';

interface TShirtTemplateProps extends React.SVGProps<SVGSVGElement> {
  activePart?: string;
}

export function TShirtTemplate({ activePart = 'front', className, ...props }: TShirtTemplateProps) {
  // A simple 2D T-shirt vector representation
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full text-gray-700 stroke-current", className)}
      {...props}
    >
      {/* Main body */}
      <path 
        d="M30 15 C 35 15, 40 25, 50 25 C 60 25, 65 15, 70 15 L 95 30 L 85 45 L 80 40 L 80 95 L 20 95 L 20 40 L 15 45 L 5 30 Z" 
        strokeWidth="1.5" 
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
      {/* Neck line */}
      <path 
        d="M40 15 C 45 25, 55 25, 60 15" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      {/* Sleeves separators */}
      <path 
        d="M25 27.5 L 20 40" 
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      <path 
        d="M75 27.5 L 80 40" 
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      
      {/* Label for active part */}
      <text 
        x="50" 
        y="55" 
        textAnchor="middle" 
        fill="currentColor" 
        fontSize="8"
        opacity="0.3"
        className="font-display uppercase tracking-widest"
      >
        {activePart} VIEW
      </text>
    </svg>
  );
}

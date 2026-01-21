import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeartRateGaugeProps {
  heartRate: number;
  minRate?: number;
  maxRate?: number;
}

const HeartRateGauge = ({ heartRate, minRate = 40, maxRate = 180 }: HeartRateGaugeProps) => {
  const normalizedValue = ((heartRate - minRate) / (maxRate - minRate)) * 100;
  const clampedValue = Math.max(0, Math.min(100, normalizedValue));
  
  // Calculate stroke dash offset for circular progress
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;
  
  const getHeartRateColor = (hr: number) => {
    if (hr < 60) return { color: 'text-risk-moderate', stroke: 'stroke-risk-moderate', bg: 'bg-risk-moderate' };
    if (hr > 100) return { color: 'text-risk-moderate', stroke: 'stroke-risk-moderate', bg: 'bg-risk-moderate' };
    if (hr > 120) return { color: 'text-risk-high', stroke: 'stroke-risk-high', bg: 'bg-risk-high' };
    return { color: 'text-primary', stroke: 'stroke-primary', bg: 'bg-primary' };
  };

  const { color, stroke, bg } = getHeartRateColor(heartRate);
  
  const getZoneLabel = (hr: number) => {
    if (hr < 60) return 'Bradycardia';
    if (hr > 100) return 'Tachycardia';
    return 'Normal';
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* SVG Gauge */}
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          
          {/* Progress circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            className={cn(stroke, 'transition-all duration-500')}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: `drop-shadow(0 0 10px currentColor)`,
            }}
          />
          
          {/* Gradient glow */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Heart className={cn('w-6 h-6 animate-heartbeat', color)} />
          <span className={cn('text-4xl font-display font-bold mt-1', color)}>
            {heartRate}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            BPM
          </span>
        </div>
      </div>
      
      {/* Zone indicator */}
      <div className="mt-4 flex items-center gap-2">
        <div className={cn('w-2 h-2 rounded-full', bg)} />
        <span className={cn('text-sm font-mono', color)}>
          {getZoneLabel(heartRate)}
        </span>
      </div>
      
      {/* Range labels */}
      <div className="flex justify-between w-full mt-2 text-xs text-muted-foreground">
        <span>{minRate}</span>
        <span>{maxRate}</span>
      </div>
    </div>
  );
};

export default HeartRateGauge;

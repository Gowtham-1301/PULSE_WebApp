import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface RiskIndicatorProps {
  level: 'low' | 'moderate' | 'high';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const RiskIndicator = ({
  level,
  showLabel = true,
  size = 'md',
  animated = true,
}: RiskIndicatorProps) => {
  const config = {
    low: {
      label: 'Low Risk',
      description: 'Normal cardiac activity detected',
      icon: CheckCircle,
      color: 'text-risk-low',
      bg: 'bg-risk-low/10',
      border: 'border-risk-low/30',
      glow: 'glow-success',
      ring: 'ring-risk-low/50',
    },
    moderate: {
      label: 'Moderate Risk',
      description: 'Minor irregularities detected',
      icon: AlertCircle,
      color: 'text-risk-moderate',
      bg: 'bg-risk-moderate/10',
      border: 'border-risk-moderate/30',
      glow: 'glow-warning',
      ring: 'ring-risk-moderate/50',
    },
    high: {
      label: 'High Risk',
      description: 'Significant abnormalities detected',
      icon: AlertTriangle,
      color: 'text-risk-high',
      bg: 'bg-risk-high/10',
      border: 'border-risk-high/30',
      glow: 'glow-danger',
      ring: 'ring-risk-high/50',
    },
  };

  const { label, description, icon: Icon, color, bg, border, glow, ring } = config[level];

  const sizeStyles = {
    sm: {
      container: 'p-3',
      icon: 'w-5 h-5',
      title: 'text-sm',
      desc: 'text-xs',
    },
    md: {
      container: 'p-4',
      icon: 'w-6 h-6',
      title: 'text-base',
      desc: 'text-sm',
    },
    lg: {
      container: 'p-6',
      icon: 'w-8 h-8',
      title: 'text-lg',
      desc: 'text-base',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        'relative rounded-lg border backdrop-blur-sm transition-all duration-500',
        bg,
        border,
        glow,
        styles.container
      )}
    >
      {/* Pulse ring animation for high risk */}
      {animated && level === 'high' && (
        <div className={cn(
          'absolute inset-0 rounded-lg animate-pulse-ring',
          bg,
          'opacity-50'
        )} />
      )}
      
      <div className="relative z-10 flex items-start gap-3">
        <div className={cn(
          'flex-shrink-0 rounded-full p-2',
          bg,
          animated && level === 'high' && 'animate-heartbeat'
        )}>
          <Icon className={cn(styles.icon, color)} />
        </div>
        
        {showLabel && (
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              'font-display font-semibold',
              styles.title,
              color
            )}>
              {label}
            </h4>
            <p className={cn(
              'text-muted-foreground mt-0.5',
              styles.desc
            )}>
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskIndicator;

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const MetricCard = ({
  label,
  value,
  unit,
  icon,
  trend,
  variant = 'default',
  size = 'md',
}: MetricCardProps) => {
  const variantStyles = {
    default: 'border-border/50 bg-card',
    primary: 'border-primary/30 bg-primary/5 glow-primary',
    success: 'border-risk-low/30 bg-risk-low/5 glow-success',
    warning: 'border-risk-moderate/30 bg-risk-moderate/5 glow-warning',
    danger: 'border-risk-high/30 bg-risk-high/5 glow-danger',
  };

  const sizeStyles = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const valueSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div
      className={cn(
        'relative rounded-lg border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]',
        variantStyles[variant],
        sizeStyles[size]
      )}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
            {label}
          </span>
          {icon && (
            <span className={cn(
              'text-primary',
              variant === 'success' && 'text-risk-low',
              variant === 'warning' && 'text-risk-moderate',
              variant === 'danger' && 'text-risk-high'
            )}>
              {icon}
            </span>
          )}
        </div>
        
        <div className="flex items-baseline gap-1">
          <span className={cn(
            'font-display font-bold tracking-tight',
            valueSizes[size],
            variant === 'primary' && 'text-primary text-glow-primary',
            variant === 'success' && 'text-risk-low',
            variant === 'warning' && 'text-risk-moderate',
            variant === 'danger' && 'text-risk-high'
          )}>
            {value}
          </span>
          {unit && (
            <span className="text-xs text-muted-foreground font-mono ml-1">
              {unit}
            </span>
          )}
        </div>
        
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            {trend === 'up' && (
              <span className="text-risk-moderate text-xs">↑</span>
            )}
            {trend === 'down' && (
              <span className="text-risk-low text-xs">↓</span>
            )}
            {trend === 'stable' && (
              <span className="text-primary text-xs">→</span>
            )}
            <span className="text-xs text-muted-foreground">
              {trend === 'stable' ? 'Stable' : trend === 'up' ? 'Increasing' : 'Decreasing'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;

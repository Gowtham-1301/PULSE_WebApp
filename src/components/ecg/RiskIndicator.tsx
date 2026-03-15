import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RiskIndicatorProps {
  level: 'low' | 'moderate' | 'high' | 'critical';
  riskScore?: number; // 0-100 scale
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  contributingFactors?: { factor: string; percentage: number }[];
}

const RiskIndicator = ({
  level,
  riskScore,
  showLabel = true,
  size = 'md',
  animated = true,
  contributingFactors,
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
      progressColor: 'bg-risk-low',
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
      progressColor: 'bg-risk-moderate',
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
      progressColor: 'bg-risk-high',
    },
    critical: {
      label: 'Critical Risk',
      description: 'Immediate medical attention recommended',
      icon: ShieldAlert,
      color: 'text-risk-critical',
      bg: 'bg-risk-critical/10',
      border: 'border-risk-critical/30',
      glow: 'glow-danger',
      ring: 'ring-risk-critical/50',
      progressColor: 'bg-risk-critical',
    },
  };

  const { label, description, icon: Icon, color, bg, border, glow, progressColor } = config[level];

  const sizeStyles = {
    sm: { container: 'p-3', icon: 'w-5 h-5', title: 'text-sm', desc: 'text-xs' },
    md: { container: 'p-4', icon: 'w-6 h-6', title: 'text-base', desc: 'text-sm' },
    lg: { container: 'p-6', icon: 'w-8 h-8', title: 'text-lg', desc: 'text-base' },
  };

  const styles = sizeStyles[size];
  const isUrgent = level === 'high' || level === 'critical';

  return (
    <div
      className={cn(
        'relative rounded-lg border backdrop-blur-sm transition-all duration-500',
        bg, border, glow, styles.container
      )}
    >
      {/* Pulse ring animation for high/critical */}
      {animated && isUrgent && (
        <div className={cn('absolute inset-0 rounded-lg animate-pulse-ring', bg, 'opacity-50')} />
      )}

      <div className="relative z-10 flex items-start gap-3">
        <div className={cn(
          'flex-shrink-0 rounded-full p-2', bg,
          animated && isUrgent && 'animate-heartbeat'
        )}>
          <Icon className={cn(styles.icon, color)} />
        </div>

        {showLabel && (
          <div className="flex-1 min-w-0">
            <h4 className={cn('font-display font-semibold', styles.title, color)}>
              {label}
            </h4>
            <p className={cn('text-muted-foreground mt-0.5', styles.desc)}>
              {description}
            </p>
          </div>
        )}
      </div>

      {/* Risk Score Progress Bar (0-100) */}
      {riskScore !== undefined && (
        <div className="relative z-10 mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Risk Score</span>
            <span className={cn('text-lg font-display font-bold', color)}>{riskScore}/100</span>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-700', progressColor)}
              style={{ width: `${Math.min(100, riskScore)}%` }}
            />
            <div
              className={cn('absolute inset-y-0 left-0 rounded-full blur-sm opacity-50 transition-all duration-700', progressColor)}
              style={{ width: `${Math.min(100, riskScore)}%` }}
            />
          </div>
        </div>
      )}

      {/* Contributing Risk Factors */}
      {contributingFactors && contributingFactors.length > 0 && (
        <div className="relative z-10 mt-4 space-y-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Top Contributing Factors</span>
          {contributingFactors.slice(0, 5).map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-foreground/80">{f.factor}</span>
                  <span className={cn('font-mono', color)}>{f.percentage}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', progressColor)}
                    style={{ width: `${f.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clinical Alert for HIGH/CRITICAL */}
      {isUrgent && (
        <div className={cn('relative z-10 mt-4 p-3 rounded-md border', border, bg)}>
          <p className={cn('text-xs font-semibold flex items-center gap-2', color)}>
            <ShieldAlert className="w-3.5 h-3.5" />
            {level === 'critical'
              ? 'URGENT: Seek immediate medical attention.'
              : 'Clinical evaluation recommended.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default RiskIndicator;

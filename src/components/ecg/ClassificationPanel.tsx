import { Activity, Brain, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassificationPanelProps {
  label: string;
  confidence: number;
  details: string;
}

const ClassificationPanel = ({ label, confidence, details }: ClassificationPanelProps) => {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return 'text-risk-low';
    if (conf >= 70) return 'text-risk-moderate';
    return 'text-risk-high';
  };

  const getConfidenceBarColor = (conf: number) => {
    if (conf >= 90) return 'bg-risk-low';
    if (conf >= 70) return 'bg-risk-moderate';
    return 'bg-risk-high';
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card p-5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-accent" />
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider">
          AI Classification
        </h3>
      </div>

      {/* Classification Label */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Detected Pattern
          </span>
        </div>
        <p className="text-xl font-display font-bold text-primary text-glow-primary">
          {label}
        </p>
      </div>

      {/* Confidence Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Confidence
            </span>
          </div>
          <span className={cn(
            'text-lg font-display font-bold',
            getConfidenceColor(confidence)
          )}>
            {confidence.toFixed(1)}%
          </span>
        </div>
        
        {/* Confidence bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
              getConfidenceBarColor(confidence)
            )}
            style={{ width: `${confidence}%` }}
          />
          {/* Glow effect */}
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full blur-sm opacity-50 transition-all duration-500',
              getConfidenceBarColor(confidence)
            )}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="pt-3 border-t border-border/30">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {details}
        </p>
      </div>

      {/* Model indicator */}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span>CNN-LSTM Hybrid Model v2.1</span>
      </div>
    </div>
  );
};

export default ClassificationPanel;

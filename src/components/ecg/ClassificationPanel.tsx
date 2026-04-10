import { Activity, Brain, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassificationPanelProps {
  label: string;
  confidence: number;
  details: string;
}

// Color-code by class severity per model spec
const getLabelSeverity = (label: string): 'safe' | 'caution' | 'warning' | 'danger' | 'critical' => {
  const l = label.toLowerCase();
  if (l.includes('stemi')) return 'critical';
  if (l.includes('ventricular tachycardia') || l.includes('atrial fibrillation')) return 'danger';
  if (l.includes('veb') || l.includes('lbbb')) return 'warning';
  if (l.includes('sveb')) return 'caution';
  return 'safe';
};

const severityStyles: Record<string, { text: string; bar: string; glow: string }> = {
  safe: { text: 'text-risk-low', bar: 'bg-risk-low', glow: 'text-glow-primary' },
  caution: { text: 'text-risk-moderate', bar: 'bg-risk-moderate', glow: '' },
  warning: { text: 'text-risk-high', bar: 'bg-risk-high', glow: '' },
  danger: { text: 'text-risk-high', bar: 'bg-risk-high', glow: '' },
  critical: { text: 'text-risk-critical', bar: 'bg-risk-critical', glow: '' },
};

const ClassificationPanel = ({ label, confidence, details }: ClassificationPanelProps) => {
  const severity = getLabelSeverity(label);
  const styles = severityStyles[severity];

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
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-accent" />
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider">
          AI Classification
        </h3>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Detected Pattern
          </span>
        </div>
        <p className={cn('text-xl font-display font-bold', styles.text, styles.glow)}>
          {label}
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Confidence
            </span>
          </div>
          <span className={cn('text-lg font-display font-bold', getConfidenceColor(confidence))}>
            {confidence.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-500', getConfidenceBarColor(confidence))}
            style={{ width: `${confidence}%` }}
          />
          <div
            className={cn('absolute inset-y-0 left-0 rounded-full blur-sm opacity-50 transition-all duration-500', getConfidenceBarColor(confidence))}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      <div className="pt-3 border-t border-border/30">
        <p className="text-sm text-muted-foreground leading-relaxed">{details}</p>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span>TCN-BiLSTM-Attention · 9-Class</span>
      </div>
    </div>
  );
};

export default ClassificationPanel;

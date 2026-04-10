import { BarChart3, ShieldQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UncertaintyEstimate } from '@/lib/tensorflowModel';

interface UncertaintyDisplayProps {
  probabilities: Record<string, number>;
  uncertainty?: UncertaintyEstimate;
  predictedLabel: string;
}

const severityColor = (label: string): string => {
  const safe = ['Normal Sinus Rhythm', 'Bradycardia', 'Tachycardia'];
  const moderate = ['SVEB', 'LBBB'];
  const high = ['VEB', 'Atrial Fibrillation', 'Ventricular Tachycardia'];
  if (high.includes(label)) return 'bg-risk-high';
  if (label === 'STEMI') return 'bg-risk-critical';
  if (moderate.includes(label)) return 'bg-risk-moderate';
  if (safe.includes(label)) return 'bg-risk-low';
  return 'bg-muted-foreground';
};

const UncertaintyDisplay = ({ probabilities, uncertainty, predictedLabel }: UncertaintyDisplayProps) => {
  const sorted = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-lg border border-border/50 bg-card p-5 backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-accent" />
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider">
          Class Probabilities
        </h3>
      </div>

      {/* Probability bars */}
      <div className="space-y-2">
        {sorted.map(([label, prob]) => (
          <div key={label} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className={cn(
                'truncate',
                label === predictedLabel ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}>
                {label}
              </span>
              <span className={cn(
                'font-mono ml-2 flex-shrink-0',
                label === predictedLabel ? 'text-primary font-bold' : 'text-muted-foreground'
              )}>
                {prob.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                  label === predictedLabel ? 'bg-primary' : severityColor(label) + '/60'
                )}
                style={{ width: `${Math.min(100, prob)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Uncertainty section */}
      {uncertainty && (
        <div className="pt-3 border-t border-border/30 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldQuestion className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Uncertainty Quantification
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-md bg-muted/30">
              <div className="text-[10px] text-muted-foreground uppercase">Epistemic</div>
              <div className="text-sm font-mono font-semibold text-foreground">
                {(uncertainty.epistemic * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-2 rounded-md bg-muted/30">
              <div className="text-[10px] text-muted-foreground uppercase">Aleatoric</div>
              <div className="text-sm font-mono font-semibold text-foreground">
                {(uncertainty.aleatoric * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-2 rounded-md bg-muted/30">
              <div className="text-[10px] text-muted-foreground uppercase">Total</div>
              <div className="text-sm font-mono font-semibold text-primary">
                {(uncertainty.total * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* 95% CI */}
          <div className="p-2 rounded-md bg-muted/20 border border-border/20">
            <div className="text-[10px] text-muted-foreground uppercase mb-1">95% Confidence Interval</div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                {uncertainty.confidenceInterval95.lower.toFixed(1)}%
              </span>
              <div className="flex-1 relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-primary/40 rounded-full"
                  style={{
                    left: `${uncertainty.confidenceInterval95.lower}%`,
                    right: `${100 - uncertainty.confidenceInterval95.upper}%`,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {uncertainty.confidenceInterval95.upper.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span>TCN-BiLSTM-Attention · 9-Class · MC Dropout</span>
      </div>
    </div>
  );
};

export default UncertaintyDisplay;

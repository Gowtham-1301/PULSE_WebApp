import { Lightbulb, TrendingUp, Activity, Coffee, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionsPanelProps {
  riskLevel: 'low' | 'moderate' | 'high';
  heartRate: number;
  hrvSdnn: number;
}

const SuggestionsPanel = ({ riskLevel, heartRate, hrvSdnn }: SuggestionsPanelProps) => {
  const getSuggestions = () => {
    const suggestions = [];

    if (riskLevel === 'low') {
      suggestions.push({
        icon: TrendingUp,
        text: 'Stable rhythm detected — maintain recording for comprehensive analysis.',
        type: 'success',
      });
    }

    if (heartRate > 85) {
      suggestions.push({
        icon: Coffee,
        text: 'Elevated heart rate detected — consider reducing caffeine intake.',
        type: 'warning',
      });
    }

    if (hrvSdnn < 40) {
      suggestions.push({
        icon: Wind,
        text: 'Low HRV observed — deep breathing exercises may help.',
        type: 'info',
      });
    }

    if (riskLevel === 'moderate') {
      suggestions.push({
        icon: Activity,
        text: 'Minor irregularities noted — continue monitoring and stay relaxed.',
        type: 'warning',
      });
    }

    if (riskLevel === 'high') {
      suggestions.push({
        icon: Activity,
        text: 'Consult a healthcare professional for clinical evaluation.',
        type: 'danger',
      });
    }

    // Default suggestions if none apply
    if (suggestions.length === 0) {
      suggestions.push({
        icon: TrendingUp,
        text: 'Normal cardiac rhythm — no immediate concerns detected.',
        type: 'success',
      });
    }

    return suggestions;
  };

  const suggestions = getSuggestions();

  const typeStyles = {
    success: 'border-risk-low/30 bg-risk-low/5 text-risk-low',
    warning: 'border-risk-moderate/30 bg-risk-moderate/5 text-risk-moderate',
    danger: 'border-risk-high/30 bg-risk-high/5 text-risk-high',
    info: 'border-primary/30 bg-primary/5 text-primary',
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card p-5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-accent" />
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider">
          Smart Suggestions
        </h3>
      </div>

      {/* Suggestions list */}
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <div
              key={index}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 hover:scale-[1.02]',
                typeStyles[suggestion.type as keyof typeof typeStyles]
              )}
            >
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground/90">{suggestion.text}</p>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="mt-4 pt-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground italic">
          These suggestions are for informational purposes only and do not constitute medical advice.
        </p>
      </div>
    </div>
  );
};

export default SuggestionsPanel;

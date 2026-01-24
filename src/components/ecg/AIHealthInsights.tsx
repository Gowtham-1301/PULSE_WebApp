import { useState } from 'react';
import { Brain, Lightbulb, AlertTriangle, CheckCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HealthInsights, useHealthInsights } from '@/hooks/useHealthInsights';

interface AIHealthInsightsProps {
  metrics: {
    heartRate: number;
    rrInterval: number;
    qrsDuration: number;
    qtInterval: number;
    hrvSdnn: number;
    hrvRmssd: number;
  };
  classification: {
    label: string;
    confidence: number;
  };
  riskLevel: 'low' | 'moderate' | 'high';
  profile?: {
    age?: number;
    bmi?: number;
    healthConditions?: string[];
  };
}

const AIHealthInsights = ({ metrics, classification, riskLevel, profile }: AIHealthInsightsProps) => {
  const { insights, isLoading, fetchInsights } = useHealthInsights();
  const [expanded, setExpanded] = useState(false);

  const handleGetInsights = async () => {
    await fetchInsights({
      metrics,
      classification,
      riskLevel,
      profile,
    });
    setExpanded(true);
  };

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-accent/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="w-5 h-5 text-accent" />
              <Sparkles className="w-3 h-3 text-primary absolute -top-1 -right-1" />
            </div>
            <h3 className="font-display font-semibold text-sm uppercase tracking-wider">
              AI Health Insights
            </h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleGetInsights}
            disabled={isLoading}
            className="text-accent hover:text-accent/80"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1" />
                {insights ? 'Refresh' : 'Analyze'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!insights && !isLoading && (
          <div className="text-center py-6">
            <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Click "Analyze" to get personalized AI health insights
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-6">
            <div className="relative w-12 h-12 mx-auto mb-3">
              <Brain className="w-12 h-12 text-accent animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-accent/30 animate-spin border-t-accent" />
            </div>
            <p className="text-sm text-muted-foreground">
              Analyzing your cardiac data...
            </p>
          </div>
        )}

        {insights && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-3 rounded-lg bg-card/50 border border-border/30">
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </div>

            {/* Positives */}
            {insights.positives.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-risk-low" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-risk-low">
                    Positive Observations
                  </span>
                </div>
                <ul className="space-y-1">
                  {insights.positives.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-risk-low mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {insights.warnings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-risk-moderate" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-risk-moderate">
                    Things to Watch
                  </span>
                </div>
                <ul className="space-y-1">
                  {insights.warnings.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-risk-moderate mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Collapsible insights and suggestions */}
            <div className={cn('space-y-4', !expanded && 'hidden')}>
              {/* Insights */}
              {insights.insights.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Health Insights
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {insights.insights.map((item, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {insights.suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                      Lifestyle Suggestions
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {insights.suggestions.map((item, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-accent mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              {expanded ? 'Show Less' : 'Show More Details'}
            </Button>
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <div className="px-4 py-2 bg-muted/20 border-t border-border/30">
        <p className="text-xs text-muted-foreground text-center">
          AI insights are for educational purposes only. Not medical advice.
        </p>
      </div>
    </div>
  );
};

export default AIHealthInsights;

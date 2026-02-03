import { Activity, AlertTriangle, CheckCircle, Heart, Shield, TrendingUp } from 'lucide-react';
import { RiskFusionResult } from '@/hooks/useRiskFusion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface RiskFusionPanelProps {
  result: RiskFusionResult | null;
  isLoading?: boolean;
}

const RiskFusionPanel = ({ result, isLoading }: RiskFusionPanelProps) => {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-primary animate-pulse" />
          <h3 className="font-display font-semibold">Risk Analysis</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted/30 rounded-lg" />
          <div className="h-8 bg-muted/30 rounded" />
          <div className="h-8 bg-muted/30 rounded" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-display font-semibold text-muted-foreground">Risk Analysis</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Complete your profile and start monitoring to see personalized risk analysis
        </p>
      </div>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-risk-low';
      case 'moderate': return 'text-risk-moderate';
      case 'high': return 'text-risk-high';
      default: return 'text-muted-foreground';
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'low': return 'bg-risk-low/20 border-risk-low/30';
      case 'moderate': return 'bg-risk-moderate/20 border-risk-moderate/30';
      case 'high': return 'bg-risk-high/20 border-risk-high/30';
      default: return 'bg-muted/20 border-border/30';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="w-6 h-6 text-risk-low" />;
      case 'moderate': return <AlertTriangle className="w-6 h-6 text-risk-moderate" />;
      case 'high': return <AlertTriangle className="w-6 h-6 text-risk-high" />;
      default: return <Shield className="w-6 h-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold">Fused Risk Analysis</h3>
        <Badge variant="outline" className="ml-auto text-xs">
          {result.confidence}% Confidence
        </Badge>
      </div>

      {/* Main Risk Level */}
      <div className={`p-4 rounded-lg border ${getRiskBg(result.finalRiskLevel)} flex items-center gap-4`}>
        {getRiskIcon(result.finalRiskLevel)}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Combined Risk Level</p>
          <p className={`text-2xl font-display font-bold uppercase ${getRiskColor(result.finalRiskLevel)}`}>
            {result.finalRiskLevel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-display font-bold">{result.fusedRiskScore}</p>
          <p className="text-xs text-muted-foreground">/ 100</p>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">ECG Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={result.ecgRiskScore} className="h-2 flex-1" />
            <span className="text-sm font-bold">{result.ecgRiskScore}</span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Clinical Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={result.clinicalRiskScore} className="h-2 flex-1" />
            <span className="text-sm font-bold">{result.clinicalRiskScore}</span>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      {result.riskFactors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-risk-moderate" />
            Risk Factors
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {result.riskFactors.map((factor, i) => (
              <Badge key={i} variant="outline" className="text-xs bg-risk-moderate/10 border-risk-moderate/30">
                {factor}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Protective Factors */}
      {result.protectiveFactors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-risk-low" />
            Protective Factors
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {result.protectiveFactors.map((factor, i) => (
              <Badge key={i} variant="outline" className="text-xs bg-risk-low/10 border-risk-low/30">
                {factor}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Recommendations
          </h4>
          <ul className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RiskFusionPanel;

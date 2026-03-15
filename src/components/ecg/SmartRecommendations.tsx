import { useState } from 'react';
import { Stethoscope, ClipboardList, Pill, Dumbbell, AlertOctagon, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type RecommendationType = 'diagnostic' | 'monitoring' | 'medication' | 'lifestyle' | 'urgent';
type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: PriorityLevel;
  title: string;
  description: string;
  explanation: string;
  timeframe: string;
  evidence?: string;
}

interface SmartRecommendationsProps {
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  heartRate: number;
  hrvSdnn: number;
  classification: string;
}

const typeConfig: Record<RecommendationType, { icon: typeof Stethoscope; emoji: string; label: string; color: string }> = {
  diagnostic: { icon: Stethoscope, emoji: '🩺', label: 'Diagnostic', color: 'text-primary' },
  monitoring: { icon: ClipboardList, emoji: '📋', label: 'Monitoring', color: 'text-accent' },
  medication: { icon: Pill, emoji: '💊', label: 'Medication', color: 'text-risk-moderate' },
  lifestyle: { icon: Dumbbell, emoji: '🏃', label: 'Lifestyle', color: 'text-risk-low' },
  urgent: { icon: AlertOctagon, emoji: '🚨', label: 'Urgent', color: 'text-risk-critical' },
};

const priorityStyles: Record<PriorityLevel, string> = {
  critical: 'bg-risk-critical/15 text-risk-critical border-risk-critical/30',
  high: 'bg-risk-high/15 text-risk-high border-risk-high/30',
  medium: 'bg-risk-moderate/15 text-risk-moderate border-risk-moderate/30',
  low: 'bg-risk-low/15 text-risk-low border-risk-low/30',
};

const generateRecommendations = (
  riskLevel: string,
  heartRate: number,
  hrvSdnn: number,
  classification: string
): Recommendation[] => {
  const recs: Recommendation[] = [];

  if (riskLevel === 'critical' || riskLevel === 'high') {
    recs.push({
      id: 'urgent-1',
      type: 'urgent',
      priority: 'critical',
      title: 'Seek Clinical Evaluation',
      description: 'Schedule an appointment with a cardiologist for a comprehensive cardiac evaluation.',
      explanation: `Your ECG classification (${classification}) combined with elevated risk indicators warrants professional assessment.`,
      timeframe: 'Within 24-48 hours',
      evidence: 'ACC/AHA 2023 Guidelines for ECG abnormality follow-up',
    });
  }

  if (heartRate > 100) {
    recs.push({
      id: 'diag-1',
      type: 'diagnostic',
      priority: riskLevel === 'high' ? 'high' : 'medium',
      title: 'Evaluate Tachycardia',
      description: 'Heart rate exceeds 100 BPM. Consider thyroid panel, CBC, and electrolyte screening.',
      explanation: `Current HR: ${heartRate} BPM. Persistent tachycardia may indicate underlying conditions including anemia, hyperthyroidism, or dehydration.`,
      timeframe: 'Within 1 week',
      evidence: 'ESC Guidelines on Supraventricular Tachycardia 2019',
    });
  }

  if (heartRate < 50) {
    recs.push({
      id: 'diag-2',
      type: 'diagnostic',
      priority: 'high',
      title: 'Evaluate Bradycardia',
      description: 'Heart rate below 50 BPM. Assess for conduction abnormalities.',
      explanation: `Current HR: ${heartRate} BPM. May indicate AV block or sinus node dysfunction unless athletic baseline.`,
      timeframe: 'Within 48 hours',
      evidence: 'AHA/ACC Bradycardia Guidelines 2018',
    });
  }

  recs.push({
    id: 'mon-1',
    type: 'monitoring',
    priority: riskLevel === 'low' ? 'low' : 'medium',
    title: 'Continue ECG Monitoring',
    description: 'Maintain regular ECG recordings to track cardiac rhythm over time.',
    explanation: 'Serial ECG recordings help establish baseline patterns and detect early changes in cardiac rhythm.',
    timeframe: 'Ongoing — daily or weekly',
    evidence: 'NICE CG108 — Chronic heart disease monitoring',
  });

  if (hrvSdnn < 30) {
    recs.push({
      id: 'life-1',
      type: 'lifestyle',
      priority: 'medium',
      title: 'Improve Heart Rate Variability',
      description: 'Practice deep breathing exercises (4-7-8 technique) and ensure 7-9 hours of quality sleep.',
      explanation: `Your HRV SDNN is ${hrvSdnn.toFixed(0)} ms (low). Low HRV is associated with increased cardiovascular risk and autonomic imbalance.`,
      timeframe: 'Start immediately — reassess in 2 weeks',
      evidence: 'Shaffer & Ginsberg, 2017 — HRV review in Frontiers in Public Health',
    });
  }

  if (riskLevel === 'moderate' || riskLevel === 'high') {
    recs.push({
      id: 'med-1',
      type: 'medication',
      priority: 'medium',
      title: 'Review Current Medications',
      description: 'Discuss ECG findings with your prescribing physician to assess medication effects.',
      explanation: 'Certain medications (beta-blockers, antiarrhythmics, QT-prolonging drugs) can affect ECG patterns.',
      timeframe: 'At next scheduled visit',
      evidence: 'CredibleMeds QT drug list — AZCERT',
    });
  }

  recs.push({
    id: 'life-2',
    type: 'lifestyle',
    priority: 'low',
    title: 'Maintain Heart-Healthy Lifestyle',
    description: '150 min/week moderate aerobic exercise, balanced diet, limit caffeine and alcohol.',
    explanation: 'Regular cardiovascular exercise strengthens the heart muscle and improves autonomic regulation.',
    timeframe: 'Ongoing',
    evidence: 'AHA Physical Activity Guidelines 2018',
  });

  // Sort by priority
  const order: Record<PriorityLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]);
};

const SmartRecommendations = ({ riskLevel, heartRate, hrvSdnn, classification }: SmartRecommendationsProps) => {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const recommendations = generateRecommendations(riskLevel, heartRate, hrvSdnn, classification);

  const toggleDone = (id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="w-5 h-5 text-accent" />
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider">
          Smart Clinical Recommendations
        </h3>
        <Badge variant="outline" className="ml-auto text-xs">
          {recommendations.length} items
        </Badge>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => {
          const cfg = typeConfig[rec.type];
          const Icon = cfg.icon;
          const isDone = completedIds.has(rec.id);
          const isExpanded = expandedId === rec.id;

          return (
            <div
              key={rec.id}
              className={cn(
                'rounded-lg border transition-all duration-300',
                isDone
                  ? 'border-risk-low/20 bg-risk-low/5 opacity-70'
                  : 'border-border/30 bg-card/50 hover:border-border/60'
              )}
            >
              <div className="p-3 flex items-start gap-3">
                {/* Type emoji */}
                <span className="text-lg mt-0.5 flex-shrink-0">{cfg.emoji}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-sm font-semibold', isDone && 'line-through text-muted-foreground')}>
                      {rec.title}
                    </span>
                    <Badge className={cn('text-[10px] px-1.5 py-0 h-4 border', priorityStyles[rec.priority])}>
                      {rec.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4', cfg.color)}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">⏱ {rec.timeframe}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('h-7 w-7 p-0', isDone && 'text-risk-low')}
                    onClick={() => toggleDone(rec.id)}
                    title={isDone ? 'Mark as pending' : 'Mark as done'}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-border/20 ml-9 space-y-2 animate-fade-in-up">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Explanation</span>
                    <p className="text-xs text-foreground/80 mt-0.5">{rec.explanation}</p>
                  </div>
                  {rec.evidence && (
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Evidence</span>
                      <p className="text-xs text-primary/80 mt-0.5 italic">{rec.evidence}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground italic">
          These recommendations are AI-generated for informational purposes only and do not constitute medical advice.
        </p>
      </div>
    </div>
  );
};

export default SmartRecommendations;

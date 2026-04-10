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
  const cl = classification.toLowerCase();

  // STEMI or VT → URGENT
  if (cl.includes('stemi') || cl.includes('ventricular tachycardia')) {
    recs.push({
      id: 'urg-1', type: 'urgent', priority: 'critical',
      title: 'Seek Immediate Medical Attention',
      description: 'Life-threatening arrhythmia or acute heart attack pattern detected.',
      explanation: `Classification: ${classification}. This requires emergency evaluation.`,
      timeframe: 'Immediately — call 911',
      evidence: 'AHA/ACC STEMI & VT Management Guidelines',
    });
    recs.push({
      id: 'urg-2', type: 'urgent', priority: 'critical',
      title: 'Call Emergency Services',
      description: 'Do not delay — go to the nearest emergency department.',
      explanation: 'Prompt intervention significantly improves survival outcomes.',
      timeframe: 'Now',
    });
  }

  // High/critical risk score
  if (riskLevel === 'critical' || riskLevel === 'high') {
    recs.push({
      id: 'diag-urg', type: 'diagnostic', priority: 'high',
      title: 'Schedule Urgent 12-Lead ECG',
      description: 'High risk indicators require confirmatory diagnostic testing.',
      explanation: `Risk level: ${riskLevel.toUpperCase()}. Classification: ${classification}.`,
      timeframe: 'Within 24 hours',
      evidence: 'ACC/AHA 2023 ECG abnormality follow-up guidelines',
    });
  }

  // Atrial Fibrillation
  if (cl.includes('atrial fibrillation')) {
    recs.push({
      id: 'diag-af', type: 'diagnostic', priority: 'high',
      title: 'Schedule 12-Lead ECG for AF Confirmation',
      description: 'Confirm atrial fibrillation with a full diagnostic ECG.',
      explanation: 'AF increases stroke risk; early confirmation enables anticoagulation decisions.',
      timeframe: 'Within 24 hours',
      evidence: 'ESC 2020 AF Guidelines',
    });
    recs.push({
      id: 'med-af', type: 'medication', priority: 'high',
      title: 'Discuss Anticoagulation Therapy',
      description: 'Consult cardiologist about blood thinners to reduce stroke risk.',
      explanation: 'AF is associated with 5x increased stroke risk; anticoagulation is first-line.',
      timeframe: 'Urgent',
      evidence: 'CHA₂DS₂-VASc scoring, ESC 2020',
    });
  }

  // Tachycardia
  if (heartRate > 100) {
    recs.push({
      id: 'diag-tachy', type: 'diagnostic', priority: riskLevel === 'high' ? 'high' : 'medium',
      title: 'Evaluate Tachycardia',
      description: 'Consider thyroid panel, CBC, and electrolyte screening.',
      explanation: `HR: ${heartRate} BPM. Persistent tachycardia may indicate anemia, hyperthyroidism, or dehydration.`,
      timeframe: 'Within 1 week',
      evidence: 'ESC SVT Guidelines 2019',
    });
  }

  // Bradycardia
  if (heartRate < 50) {
    recs.push({
      id: 'diag-brady', type: 'diagnostic', priority: 'high',
      title: 'Evaluate Bradycardia',
      description: 'Assess for conduction abnormalities or sinus node dysfunction.',
      explanation: `HR: ${heartRate} BPM. May indicate AV block unless athletic baseline.`,
      timeframe: 'Within 48 hours',
      evidence: 'AHA/ACC Bradycardia Guidelines 2018',
    });
  }

  // VEB / SVEB
  if (cl.includes('veb') || cl.includes('sveb')) {
    recs.push({
      id: 'mon-ect', type: 'monitoring', priority: 'medium',
      title: 'Monitor Ectopic Beat Frequency',
      description: 'Track the frequency and patterns of ectopic beats over time.',
      explanation: 'Isolated ectopic beats are often benign but increased burden warrants follow-up.',
      timeframe: 'Ongoing',
      evidence: 'ACC/AHA PVC Management 2017',
    });
    recs.push({
      id: 'med-ect', type: 'medication', priority: 'medium',
      title: 'Consider Beta-Blockers',
      description: 'Discuss rate-control medication with your physician if symptomatic.',
      explanation: 'Beta-blockers can suppress ectopic activity and reduce symptoms.',
      timeframe: 'At next visit',
    });
  }

  // LBBB
  if (cl.includes('lbbb')) {
    recs.push({
      id: 'diag-lbbb', type: 'diagnostic', priority: 'high',
      title: 'Echocardiogram Recommended',
      description: 'Assess cardiac function and rule out underlying structural disease.',
      explanation: 'New LBBB may indicate cardiomyopathy or ischemic heart disease.',
      timeframe: 'Within 1 week',
      evidence: 'ACC/AHA Heart Failure Guidelines 2022',
    });
  }

  // Low HRV
  if (hrvSdnn < 30) {
    recs.push({
      id: 'life-hrv', type: 'lifestyle', priority: 'medium',
      title: 'Improve Heart Rate Variability',
      description: 'Practice deep breathing (4-7-8 technique), ensure 7-9 hours of sleep.',
      explanation: `HRV SDNN: ${hrvSdnn.toFixed(0)} ms (low). Low HRV is associated with increased CV risk.`,
      timeframe: 'Start immediately — reassess in 2 weeks',
      evidence: 'Shaffer & Ginsberg 2017, Frontiers in Public Health',
    });
  }

  // Monitoring
  recs.push({
    id: 'mon-1', type: 'monitoring', priority: riskLevel === 'low' ? 'low' : 'medium',
    title: 'Continue ECG Monitoring',
    description: 'Maintain regular ECG recordings to track cardiac rhythm over time.',
    explanation: 'Serial recordings establish baselines and detect early changes.',
    timeframe: 'Ongoing',
    evidence: 'NICE CG108',
  });

  // Medication review for moderate+
  if (riskLevel === 'moderate' || riskLevel === 'high' || riskLevel === 'critical') {
    recs.push({
      id: 'med-rev', type: 'medication', priority: 'medium',
      title: 'Review Current Medications',
      description: 'Discuss ECG findings with prescribing physician.',
      explanation: 'Beta-blockers, antiarrhythmics, QT-prolonging drugs can affect ECG patterns.',
      timeframe: 'At next scheduled visit',
      evidence: 'CredibleMeds QT drug list — AZCERT',
    });
  }

  // Lifestyle — always
  recs.push({
    id: 'life-gen', type: 'lifestyle', priority: 'low',
    title: 'Maintain Heart-Healthy Lifestyle',
    description: '150 min/week aerobic exercise, balanced diet, limit caffeine/alcohol.',
    explanation: 'Regular exercise strengthens the heart and improves autonomic regulation.',
    timeframe: 'Ongoing',
    evidence: 'AHA Physical Activity Guidelines 2018',
  });

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

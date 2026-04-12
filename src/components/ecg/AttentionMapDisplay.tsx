import { useMemo } from 'react';
import { Brain, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttentionMapDisplayProps {
  ecgData: { time: number; value: number }[];
  attentionWeights: number[];
  classification: string;
  className?: string;
}

const REGION_LABELS = ['P-wave', 'PR', 'Q', 'R-peak', 'S', 'ST', 'T-wave', 'Baseline'];

const AttentionMapDisplay = ({ ecgData, attentionWeights, classification, className }: AttentionMapDisplayProps) => {
  const { segments, topRegions } = useMemo(() => {
    if (!attentionWeights.length || !ecgData.length) {
      return { segments: [], topRegions: [] };
    }

    // Divide attention weights into 8 morphological segments
    const segLen = Math.floor(attentionWeights.length / 8);
    const segs = REGION_LABELS.map((label, i) => {
      const start = i * segLen;
      const end = i === 7 ? attentionWeights.length : (i + 1) * segLen;
      const slice = attentionWeights.slice(start, end);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      return { label, importance: avg, startPct: (start / attentionWeights.length) * 100, widthPct: ((end - start) / attentionWeights.length) * 100 };
    });

    const sorted = [...segs].sort((a, b) => b.importance - a.importance);
    return { segments: segs, topRegions: sorted.slice(0, 3) };
  }, [attentionWeights, ecgData.length]);

  // Render the heatmap bar
  const maxImportance = Math.max(...segments.map(s => s.importance), 0.01);

  const getHeatColor = (importance: number) => {
    const ratio = importance / maxImportance;
    if (ratio > 0.8) return 'bg-red-500';
    if (ratio > 0.6) return 'bg-orange-500';
    if (ratio > 0.4) return 'bg-yellow-500';
    if (ratio > 0.2) return 'bg-blue-400';
    return 'bg-blue-200';
  };

  const getHeatOpacity = (importance: number) => {
    const ratio = importance / maxImportance;
    return 0.3 + ratio * 0.7;
  };

  if (!segments.length) {
    return (
      <div className={cn('rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-accent" />
          <h4 className="font-display font-semibold text-sm uppercase tracking-wider">Attention Map</h4>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          Start recording to view model attention weights
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" />
          <h4 className="font-display font-semibold text-sm uppercase tracking-wider">Attention Map</h4>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Brain className="w-3 h-3" />
          <span>{classification}</span>
        </div>
      </div>

      {/* Heatmap Bar */}
      <div className="mb-4">
        <div className="flex h-6 rounded-md overflow-hidden border border-border/30">
          {segments.map((seg, i) => (
            <div
              key={i}
              className={cn('relative transition-all duration-300', getHeatColor(seg.importance))}
              style={{ width: `${seg.widthPct}%`, opacity: getHeatOpacity(seg.importance) }}
              title={`${seg.label}: ${(seg.importance * 100).toFixed(1)}%`}
            />
          ))}
        </div>
        {/* Labels */}
        <div className="flex mt-1">
          {segments.map((seg, i) => (
            <div
              key={i}
              className="text-center overflow-hidden"
              style={{ width: `${seg.widthPct}%` }}
            >
              <span className="text-[9px] text-muted-foreground leading-none truncate block">
                {seg.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Attended Regions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Most Important Regions
        </p>
        {topRegions.map((region, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs font-mono w-4 text-muted-foreground">{i + 1}.</span>
            <span className="text-xs font-medium flex-1">{region.label}</span>
            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', getHeatColor(region.importance))}
                style={{ width: `${(region.importance / maxImportance) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground w-12 text-right">
              {(region.importance * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
        <span className="text-[10px] text-muted-foreground">Importance:</span>
        <div className="flex items-center gap-1">
          {['bg-blue-200', 'bg-blue-400', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'].map((color, i) => (
            <div key={i} className={cn('w-4 h-2 rounded-sm', color)} />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">Low → High</span>
      </div>
    </div>
  );
};

export default AttentionMapDisplay;

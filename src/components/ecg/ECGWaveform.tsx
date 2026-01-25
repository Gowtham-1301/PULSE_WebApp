import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Scatter, ComposedChart } from 'recharts';
import { Peak } from '@/lib/peakDetection';

interface ECGDataPoint {
  time: number;
  value: number;
}

interface ECGWaveformProps {
  data: ECGDataPoint[];
  peaks?: Peak[];
  riskLevel?: 'low' | 'moderate' | 'high';
  showPeaks?: boolean;
}

const ECGWaveform = ({ data, peaks = [], riskLevel = 'low', showPeaks = true }: ECGWaveformProps) => {
  const strokeColor = useMemo(() => {
    switch (riskLevel) {
      case 'high':
        return 'hsl(0, 100%, 55%)';
      case 'moderate':
        return 'hsl(45, 100%, 50%)';
      default:
        return 'hsl(180, 100%, 60%)';
    }
  }, [riskLevel]);

  const glowFilter = useMemo(() => {
    switch (riskLevel) {
      case 'high':
        return 'drop-shadow(0 0 8px hsl(0, 100%, 55%)) drop-shadow(0 0 16px hsl(0, 100%, 55%))';
      case 'moderate':
        return 'drop-shadow(0 0 8px hsl(45, 100%, 50%)) drop-shadow(0 0 16px hsl(45, 100%, 50%))';
      default:
        return 'drop-shadow(0 0 8px hsl(180, 100%, 60%)) drop-shadow(0 0 16px hsl(180, 100%, 60%))';
    }
  }, [riskLevel]);

  // Transform data for display (show last 3 seconds)
  const { displayData, displayPeaks, startTime } = useMemo(() => {
    if (data.length === 0) return { displayData: [], displayPeaks: [], startTime: 0 };
    const latestTime = data[data.length - 1]?.time || 0;
    const start = latestTime - 3;
    
    const filteredData = data
      .filter(d => d.time >= start)
      .map(d => ({
        ...d,
        displayTime: d.time - start,
      }));
    
    // Filter peaks within display window
    const filteredPeaks = peaks
      .filter(p => p.time >= start && p.time <= latestTime)
      .map(p => ({
        displayTime: p.time - start,
        value: p.value,
        time: p.time,
      }));
    
    return { displayData: filteredData, displayPeaks: filteredPeaks, startTime: start };
  }, [data, peaks]);

  // Custom peak marker
  const PeakMarker = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    
    return (
      <g>
        {/* Outer glow */}
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill="none"
          stroke="hsl(340, 100%, 60%)"
          strokeWidth={1}
          opacity={0.3}
        />
        {/* Inner dot */}
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill="hsl(340, 100%, 60%)"
          filter="drop-shadow(0 0 4px hsl(340, 100%, 60%))"
        />
        {/* R label */}
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          fill="hsl(340, 100%, 70%)"
          fontSize={10}
          fontWeight="bold"
        >
          R
        </text>
      </g>
    );
  };

  return (
    <div className="relative w-full h-full ecg-grid rounded-lg overflow-hidden">
      {/* Scan line effect */}
      <div className="ecg-scan-line opacity-30" />
      
      {/* Peak count indicator */}
      {showPeaks && displayPeaks.length > 0 && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-primary/30">
          <div className="w-2 h-2 rounded-full bg-[hsl(340,100%,60%)] animate-pulse" />
          <span className="text-xs font-mono text-primary">
            {displayPeaks.length} R-peaks detected
          </span>
        </div>
      )}
      
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={displayData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <XAxis
            dataKey="displayTime"
            stroke="hsl(180, 40%, 25%)"
            tick={{ fill: 'hsl(180, 40%, 40%)', fontSize: 10 }}
            tickFormatter={(value) => `${value.toFixed(1)}s`}
            domain={[0, 3]}
            type="number"
            tickCount={7}
          />
          <YAxis
            stroke="hsl(180, 40%, 25%)"
            tick={{ fill: 'hsl(180, 40%, 40%)', fontSize: 10 }}
            domain={[-0.5, 1.5]}
            tickFormatter={(value) => `${value.toFixed(1)}mV`}
          />
          <ReferenceLine y={0} stroke="hsl(180, 40%, 20%)" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            style={{ filter: glowFilter }}
          />
          {showPeaks && (
            <Scatter
              data={displayPeaks}
              dataKey="value"
              shape={<PeakMarker />}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Corner decorations */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary/50" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-primary/50" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-primary/50" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary/50" />
    </div>
  );
};

export default ECGWaveform;

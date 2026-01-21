import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ECGDataPoint {
  time: number;
  value: number;
}

interface ECGWaveformProps {
  data: ECGDataPoint[];
  riskLevel?: 'low' | 'moderate' | 'high';
}

const ECGWaveform = ({ data, riskLevel = 'low' }: ECGWaveformProps) => {
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
  const displayData = useMemo(() => {
    if (data.length === 0) return [];
    const startTime = data[data.length - 1]?.time - 3 || 0;
    return data
      .filter(d => d.time >= startTime)
      .map(d => ({
        ...d,
        displayTime: d.time - startTime,
      }));
  }, [data]);

  return (
    <div className="relative w-full h-full ecg-grid rounded-lg overflow-hidden">
      {/* Scan line effect */}
      <div className="ecg-scan-line opacity-30" />
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
        </LineChart>
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

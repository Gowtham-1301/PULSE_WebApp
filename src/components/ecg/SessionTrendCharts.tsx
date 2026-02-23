import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import type { ECGSession } from '@/hooks/useSessionHistory';

interface SessionTrendChartsProps {
  sessions: ECGSession[];
}

const SessionTrendCharts = ({ sessions }: SessionTrendChartsProps) => {
  const chartData = useMemo(() => {
    return [...sessions]
      .filter((s) => s.heart_rate_avg !== null)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .map((s) => ({
        date: format(new Date(s.start_time), 'MMM dd'),
        fullDate: format(new Date(s.start_time), 'MMM dd, yyyy hh:mm a'),
        hr: Number(s.heart_rate_avg) || null,
        hrMin: Number(s.heart_rate_min) || null,
        hrMax: Number(s.heart_rate_max) || null,
        hrvSdnn: s.hrv_sdnn ? Number(s.hrv_sdnn) : null,
        hrvRmssd: s.hrv_rmssd ? Number(s.hrv_rmssd) : null,
      }));
  }, [sessions]);

  if (chartData.length < 2) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    return (
      <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm p-3 text-xs shadow-xl">
        <p className="font-mono text-muted-foreground mb-2">{data?.fullDate}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="flex items-center gap-2" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: <span className="font-mono font-bold">{entry.value?.toFixed(1)}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Heart Rate Trend */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5">
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider mb-4 text-foreground">
          Heart Rate Trend
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="hrRangeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="hsl(180, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 30%, 15%)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(180, 20%, 60%)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                stroke="hsl(220, 30%, 15%)"
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: 'hsl(180, 20%, 60%)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                stroke="hsl(220, 30%, 15%)"
                unit=" bpm"
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={60} stroke="hsl(150, 80%, 45%)" strokeDasharray="6 4" strokeOpacity={0.4} />
              <ReferenceLine y={100} stroke="hsl(40, 100%, 55%)" strokeDasharray="6 4" strokeOpacity={0.4} />
              <Area
                type="monotone"
                dataKey="hrMin"
                stroke="none"
                fill="url(#hrRangeGradient)"
                name="HR Min"
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="hrMax"
                stroke="hsl(180, 100%, 50%)"
                strokeOpacity={0.15}
                fill="url(#hrRangeGradient)"
                name="HR Max"
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="hr"
                stroke="hsl(180, 100%, 50%)"
                strokeWidth={2}
                fill="url(#hrGradient)"
                name="Avg HR"
                dot={{ r: 3, fill: 'hsl(180, 100%, 50%)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'hsl(180, 100%, 50%)', stroke: 'hsl(220, 20%, 6%)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-6 h-px" style={{ background: 'hsl(150, 80%, 45%)', opacity: 0.6 }} /> Normal low (60)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-6 h-px" style={{ background: 'hsl(40, 100%, 55%)', opacity: 0.6 }} /> Normal high (100)
          </span>
        </div>
      </div>

      {/* HRV Trend */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5">
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider mb-4 text-foreground">
          HRV Trend (Heart Rate Variability)
        </h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="sdnnGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(300, 100%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(300, 100%, 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rmssdGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(260, 100%, 70%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(260, 100%, 70%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 30%, 15%)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(180, 20%, 60%)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                stroke="hsl(220, 30%, 15%)"
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: 'hsl(180, 20%, 60%)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                stroke="hsl(220, 30%, 15%)"
                unit=" ms"
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={30} stroke="hsl(40, 100%, 55%)" strokeDasharray="6 4" strokeOpacity={0.4} />
              <Area
                type="monotone"
                dataKey="hrvRmssd"
                stroke="hsl(260, 100%, 70%)"
                strokeWidth={1.5}
                fill="url(#rmssdGradient)"
                name="RMSSD"
                dot={{ r: 2, fill: 'hsl(260, 100%, 70%)', strokeWidth: 0 }}
                activeDot={{ r: 4, fill: 'hsl(260, 100%, 70%)', stroke: 'hsl(220, 20%, 6%)', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="hrvSdnn"
                stroke="hsl(300, 100%, 60%)"
                strokeWidth={2}
                fill="url(#sdnnGradient)"
                name="SDNN"
                dot={{ r: 3, fill: 'hsl(300, 100%, 60%)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'hsl(300, 100%, 60%)', stroke: 'hsl(220, 20%, 6%)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(300, 100%, 60%)' }} /> SDNN
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(260, 100%, 70%)' }} /> RMSSD
          </span>
          <span className="flex items-center gap-1">
            <span className="w-6 h-px" style={{ background: 'hsl(40, 100%, 55%)', opacity: 0.6 }} /> Low HRV threshold (30ms)
          </span>
        </div>
      </div>
    </div>
  );
};

export default SessionTrendCharts;

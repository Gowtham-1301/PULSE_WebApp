import { useState, useEffect } from 'react';
import { Activity, Heart, TrendingUp, Clock, ChevronRight, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import MetricCard from '@/components/ecg/MetricCard';
import RiskIndicator from '@/components/ecg/RiskIndicator';
import HeartRateGauge from '@/components/ecg/HeartRateGauge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

interface SessionSummary {
  date: string;
  heartRateAvg: number;
  classification: string;
  riskLevel: 'low' | 'moderate' | 'high';
  duration: string;
  rrInterval: number;
  qrsDuration: number;
  qtInterval: number;
  hrvSdnn: number;
  hrvRmssd: number;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { user } = useAuth();
  const [lastSession, setLastSession] = useState<SessionSummary | null>(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) { setIsLoading(false); return; }
      try {
        // Fetch latest session and count in parallel
        const [latestRes, countRes] = await Promise.all([
          supabase
            .from('ecg_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('start_time', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('ecg_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);

        setTotalSessions(countRes.count ?? 0);

        if (latestRes.data) {
          const s = latestRes.data;
          const start = new Date(s.start_time);
          const end = s.end_time ? new Date(s.end_time) : new Date();
          const durationMs = end.getTime() - start.getTime();
          const mins = Math.floor(durationMs / 60000);
          const secs = Math.floor((durationMs % 60000) / 1000);

          setLastSession({
            date: start.toLocaleDateString(),
            heartRateAvg: Math.round(Number(s.heart_rate_avg) || 0),
            classification: s.classification || 'Normal Sinus Rhythm',
            riskLevel: (s.risk_level as 'low' | 'moderate' | 'high') || 'low',
            duration: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
            rrInterval: Number(s.rr_interval_avg) || 0,
            qrsDuration: Number(s.qrs_duration_avg) || 0,
            qtInterval: Number(s.qt_interval_avg) || 0,
            hrvSdnn: Number(s.hrv_sdnn) || 0,
            hrvRmssd: Number(s.hrv_rmssd) || 0,
          });
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-cyber">
        <Header onNavigate={onNavigate} currentPage="dashboard" />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-cyber">
      <Header onNavigate={onNavigate} currentPage="dashboard" />

      <main className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in-up">
          <h2 className="font-display text-3xl font-bold mb-2">
            Welcome back
            {user?.user_metadata?.full_name && (
              <span className="text-primary">, {user.user_metadata.full_name}</span>
            )}
          </h2>
          <p className="text-muted-foreground">
            Your cardiac health overview at a glance
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
          <Button
            onClick={() => onNavigate('monitor')}
            className="h-auto p-6 flex flex-col items-start gap-3 bg-primary/10 border border-primary/30 hover:bg-primary/20 glow-primary"
          >
            <div className="flex items-center gap-3">
              <Play className="w-6 h-6 text-primary" />
              <span className="font-display font-semibold text-lg">Start Recording</span>
            </div>
            <p className="text-sm text-muted-foreground text-left">
              Begin a new ECG monitoring session
            </p>
          </Button>

          <MetricCard
            label="Last Recording"
            value={lastSession?.date || 'No sessions'}
            icon={<Clock className="w-4 h-4" />}
            variant="default"
          />

          <MetricCard
            label="Avg Heart Rate"
            value={lastSession?.heartRateAvg || '--'}
            unit={lastSession ? 'BPM' : ''}
            icon={<Heart className="w-4 h-4" />}
            variant="primary"
          />

          <MetricCard
            label="Total Sessions"
            value={totalSessions}
            icon={<TrendingUp className="w-4 h-4" />}
            variant="default"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Status */}
          <div className="lg:col-span-2 space-y-6">
            {/* Health Summary Card */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Activity className="w-6 h-6 text-primary" />
                  <h3 className="font-display font-semibold text-lg">Health Summary</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80"
                  onClick={() => onNavigate('history')}
                >
                  View History
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {lastSession ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard
                      label="RR Interval"
                      value={lastSession.rrInterval.toFixed(3)}
                      unit="sec"
                      variant="default"
                      size="sm"
                    />
                    <MetricCard
                      label="QRS Duration"
                      value={lastSession.qrsDuration.toFixed(3)}
                      unit="sec"
                      variant="default"
                      size="sm"
                    />
                    <MetricCard
                      label="QT Interval"
                      value={lastSession.qtInterval.toFixed(3)}
                      unit="sec"
                      variant="default"
                      size="sm"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MetricCard
                      label="HRV SDNN"
                      value={lastSession.hrvSdnn.toFixed(1)}
                      unit="ms"
                      trend="stable"
                      variant="default"
                      size="sm"
                    />
                    <MetricCard
                      label="HRV RMSSD"
                      value={lastSession.hrvRmssd.toFixed(1)}
                      unit="ms"
                      trend="stable"
                      variant="default"
                      size="sm"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No sessions recorded yet. Start your first recording!</p>
                </div>
              )}
            </div>

            {/* Last Session Classification */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <h3 className="font-display font-semibold text-lg mb-4">
                Last Session Result
              </h3>
              
              {lastSession ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Classification</p>
                      <p className="text-xl font-display font-bold text-primary">
                        {lastSession.classification}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Duration</p>
                      <p className="text-xl font-mono font-bold">{lastSession.duration}</p>
                    </div>
                  </div>
                  <RiskIndicator level={lastSession.riskLevel} size="md" />
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Record an ECG session to see your classification results here.
                </p>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Heart Rate Gauge */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <h3 className="font-display font-semibold text-lg mb-4 text-center">
                Last Heart Rate
              </h3>
              <HeartRateGauge heartRate={lastSession?.heartRateAvg || 0} />
            </div>

            {/* Quick Tips */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <h3 className="font-display font-semibold text-lg mb-4">Quick Tips</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Record ECG in a relaxed state for best results
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Avoid caffeine 30 minutes before recording
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Maintain consistent recording times daily
                </li>
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl border border-risk-moderate/30 bg-risk-moderate/5 p-4">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-risk-moderate">Disclaimer:</span> This 
                application is for educational and decision-support purposes only. It is 
                not intended to diagnose, treat, or replace professional medical advice.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

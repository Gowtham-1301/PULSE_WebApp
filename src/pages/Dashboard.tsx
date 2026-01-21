import { useState } from 'react';
import { Activity, Heart, TrendingUp, Clock, ChevronRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import MetricCard from '@/components/ecg/MetricCard';
import RiskIndicator from '@/components/ecg/RiskIndicator';
import HeartRateGauge from '@/components/ecg/HeartRateGauge';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { user } = useAuth();
  const [lastSession] = useState({
    date: new Date().toLocaleDateString(),
    heartRateAvg: 72,
    classification: 'Normal Sinus Rhythm',
    riskLevel: 'low' as const,
    duration: '12:34',
  });

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
            value={lastSession.date}
            icon={<Clock className="w-4 h-4" />}
            variant="default"
          />

          <MetricCard
            label="Avg Heart Rate"
            value={lastSession.heartRateAvg}
            unit="BPM"
            icon={<Heart className="w-4 h-4" />}
            variant="primary"
          />

          <MetricCard
            label="Total Sessions"
            value="24"
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  label="RR Interval"
                  value="0.833"
                  unit="sec"
                  variant="default"
                  size="sm"
                />
                <MetricCard
                  label="QRS Duration"
                  value="0.08"
                  unit="sec"
                  variant="default"
                  size="sm"
                />
                <MetricCard
                  label="QT Interval"
                  value="0.36"
                  unit="sec"
                  variant="default"
                  size="sm"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard
                  label="HRV SDNN"
                  value="45.2"
                  unit="ms"
                  trend="stable"
                  variant="default"
                  size="sm"
                />
                <MetricCard
                  label="HRV RMSSD"
                  value="35.8"
                  unit="ms"
                  trend="stable"
                  variant="default"
                  size="sm"
                />
              </div>
            </div>

            {/* Last Session Classification */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <h3 className="font-display font-semibold text-lg mb-4">
                Last Session Result
              </h3>
              
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
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Heart Rate Gauge */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <h3 className="font-display font-semibold text-lg mb-4 text-center">
                Current Heart Rate
              </h3>
              <HeartRateGauge heartRate={lastSession.heartRateAvg} />
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

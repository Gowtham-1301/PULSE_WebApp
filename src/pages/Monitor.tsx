import { useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Download, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import ECGWaveform from '@/components/ecg/ECGWaveform';
import MetricCard from '@/components/ecg/MetricCard';
import RiskIndicator from '@/components/ecg/RiskIndicator';
import ClassificationPanel from '@/components/ecg/ClassificationPanel';
import SuggestionsPanel from '@/components/ecg/SuggestionsPanel';
import HeartRateGauge from '@/components/ecg/HeartRateGauge';
import { useECGSimulation } from '@/hooks/useECGSimulation';

interface MonitorProps {
  onNavigate: (page: string) => void;
}

const Monitor = ({ onNavigate }: MonitorProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  
  const { data, metrics, classification, riskLevel, resetData } = useECGSimulation(isRecording);

  // Session timer
  useState(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  });

  const handleStartStop = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      resetData();
      setSessionDuration(0);
      setIsRecording(true);
    }
  }, [isRecording, resetData]);

  const handleReset = useCallback(() => {
    setIsRecording(false);
    setSessionDuration(0);
    resetData();
  }, [resetData]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen gradient-cyber">
      <Header onNavigate={onNavigate} currentPage="monitor" />

      <main className="container py-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold flex items-center gap-3">
              <div className="relative">
                <Heart className={`w-8 h-8 text-primary ${isRecording ? 'animate-heartbeat' : ''}`} />
                {isRecording && (
                  <div className="absolute inset-0 animate-pulse-ring bg-primary/30 rounded-full" />
                )}
              </div>
              Live ECG Monitor
            </h2>
            <p className="text-muted-foreground mt-1">
              Real-time cardiac rhythm visualization and analysis
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-lg bg-muted/50 border border-border/50 font-mono text-lg">
              {formatDuration(sessionDuration)}
            </div>
            
            <Button
              onClick={handleStartStop}
              className={`${
                isRecording
                  ? 'bg-destructive hover:bg-destructive/90'
                  : 'bg-primary hover:bg-primary/90 glow-primary'
              } font-display font-semibold px-6`}
            >
              {isRecording ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              className="border-border/50"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              disabled={data.length === 0}
              className="border-border/50"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* ECG Waveform - Main Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Waveform Display */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 h-[400px]">
              <ECGWaveform data={data} riskLevel={riskLevel} />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard
                label="Heart Rate"
                value={metrics.heartRate}
                unit="BPM"
                variant="primary"
                size="sm"
              />
              <MetricCard
                label="RR Interval"
                value={metrics.rrInterval.toFixed(3)}
                unit="sec"
                size="sm"
              />
              <MetricCard
                label="QRS Duration"
                value={metrics.qrsDuration.toFixed(3)}
                unit="sec"
                size="sm"
              />
              <MetricCard
                label="QT Interval"
                value={metrics.qtInterval.toFixed(3)}
                unit="sec"
                size="sm"
              />
              <MetricCard
                label="HRV SDNN"
                value={metrics.hrvSdnn.toFixed(1)}
                unit="ms"
                size="sm"
              />
              <MetricCard
                label="HRV RMSSD"
                value={metrics.hrvRmssd.toFixed(1)}
                unit="ms"
                size="sm"
              />
            </div>

            {/* Analysis Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ClassificationPanel
                label={classification.label}
                confidence={classification.confidence}
                details={classification.details}
              />
              <SuggestionsPanel
                riskLevel={riskLevel}
                heartRate={metrics.heartRate}
                hrvSdnn={metrics.hrvSdnn}
              />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Heart Rate Gauge */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4">
              <HeartRateGauge heartRate={metrics.heartRate} />
            </div>

            {/* Risk Indicator */}
            <RiskIndicator level={riskLevel} size="lg" />

            {/* Recording Status */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4">
              <h4 className="font-display font-semibold text-sm mb-3 uppercase tracking-wider">
                Recording Status
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={isRecording ? 'text-risk-low' : 'text-muted-foreground'}>
                    {isRecording ? 'Recording' : 'Idle'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Samples</span>
                  <span className="font-mono">{data.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-mono">{formatDuration(sessionDuration)}</span>
                </div>
              </div>
            </div>

            {/* Model Info */}
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
              <h4 className="font-display font-semibold text-sm mb-2 text-accent">
                AI Model Active
              </h4>
              <p className="text-xs text-muted-foreground">
                CNN-LSTM Hybrid Model v2.1 analyzing cardiac patterns in real-time.
                Latency: &lt;300ms
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Monitor;

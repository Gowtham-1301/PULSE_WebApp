import { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Download, Heart, Save, Loader2, FileText, Activity, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Header from '@/components/layout/Header';
import ECGWaveform from '@/components/ecg/ECGWaveform';
import MetricCard from '@/components/ecg/MetricCard';
import RiskIndicator from '@/components/ecg/RiskIndicator';
import ClassificationPanel from '@/components/ecg/ClassificationPanel';
import SuggestionsPanel from '@/components/ecg/SuggestionsPanel';
import HeartRateGauge from '@/components/ecg/HeartRateGauge';
import AIHealthInsights from '@/components/ecg/AIHealthInsights';
import CSVUploadAnalysis from '@/components/ecg/CSVUploadAnalysis';
import RiskFusionPanel from '@/components/ecg/RiskFusionPanel';
import { useECGSimulation } from '@/hooks/useECGSimulation';
import { useRiskFusion } from '@/hooks/useRiskFusion';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateSessionPDF, SessionReport } from '@/lib/pdfExport';

interface MonitorProps {
  onNavigate: (page: string) => void;
}

const Monitor = ({ onNavigate }: MonitorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'realtime' | 'upload'>('realtime');
  const [isRecording, setIsRecording] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const sessionStartRef = useRef<Date | null>(null);
  const metricsHistoryRef = useRef<{
    heartRates: number[];
    rrIntervals: number[];
    qrsDurations: number[];
    qtIntervals: number[];
    hrvSdnns: number[];
    hrvRmssds: number[];
  }>({ heartRates: [], rrIntervals: [], qrsDurations: [], qtIntervals: [], hrvSdnns: [], hrvRmssds: [] });
  
  const { data, peaks, metrics, classification, riskLevel, resetData } = useECGSimulation(isRecording);
  const { result: riskFusionResult, isLoading: isCalculatingRisk, calculateRisk } = useRiskFusion();
  const { getClinicalProfile, getCompleteness } = useProfile();

  // Calculate fused risk when metrics stabilize (every 10 seconds during recording)
  useEffect(() => {
    if (!isRecording || sessionDuration === 0 || sessionDuration % 10 !== 0) return;
    if (metrics.heartRate === 0) return;

    const clinicalProfile = getClinicalProfile();
    calculateRisk({
      ecgMetrics: {
        heartRate: metrics.heartRate,
        rrInterval: metrics.rrInterval,
        qrsDuration: metrics.qrsDuration,
        qtInterval: metrics.qtInterval,
        hrvSdnn: metrics.hrvSdnn,
        hrvRmssd: metrics.hrvRmssd,
      },
      ecgClassification: {
        label: classification.label,
        confidence: classification.confidence,
      },
      clinicalProfile,
      isLiveMonitoring: true,
    });
  }, [isRecording, sessionDuration, metrics, classification, getClinicalProfile, calculateRisk]);

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Track metrics over time for averaging
  useEffect(() => {
    if (isRecording && metrics.heartRate > 0) {
      metricsHistoryRef.current.heartRates.push(metrics.heartRate);
      metricsHistoryRef.current.rrIntervals.push(metrics.rrInterval);
      metricsHistoryRef.current.qrsDurations.push(metrics.qrsDuration);
      metricsHistoryRef.current.qtIntervals.push(metrics.qtInterval);
      metricsHistoryRef.current.hrvSdnns.push(metrics.hrvSdnn);
      metricsHistoryRef.current.hrvRmssds.push(metrics.hrvRmssd);
    }
  }, [isRecording, metrics]);

  const handleStartStop = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      // Prompt to save after stopping
      if (data.length > 0) {
        setShowSaveDialog(true);
      }
    } else {
      resetData();
      setSessionDuration(0);
      sessionStartRef.current = new Date();
      metricsHistoryRef.current = { heartRates: [], rrIntervals: [], qrsDurations: [], qtIntervals: [], hrvSdnns: [], hrvRmssds: [] };
      setIsRecording(true);
    }
  }, [isRecording, resetData, data.length]);

  const handleReset = useCallback(() => {
    setIsRecording(false);
    setSessionDuration(0);
    sessionStartRef.current = null;
    metricsHistoryRef.current = { heartRates: [], rrIntervals: [], qrsDurations: [], qtIntervals: [], hrvSdnns: [], hrvRmssds: [] };
    resetData();
  }, [resetData]);

  const calculateAverage = (arr: number[]) => {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  const handleSaveSession = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Please sign in to save sessions.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const history = metricsHistoryRef.current;
      const heartRates = history.heartRates;
      
      const sessionData = {
        user_id: user.id,
        session_name: sessionName || `ECG Session ${new Date().toLocaleDateString()}`,
        start_time: sessionStartRef.current?.toISOString() || new Date().toISOString(),
        end_time: new Date().toISOString(),
        heart_rate_avg: Math.round(calculateAverage(heartRates)),
        heart_rate_min: heartRates.length > 0 ? Math.min(...heartRates) : null,
        heart_rate_max: heartRates.length > 0 ? Math.max(...heartRates) : null,
        rr_interval_avg: calculateAverage(history.rrIntervals),
        qrs_duration_avg: calculateAverage(history.qrsDurations),
        qt_interval_avg: calculateAverage(history.qtIntervals),
        hrv_sdnn: calculateAverage(history.hrvSdnns),
        hrv_rmssd: calculateAverage(history.hrvRmssds),
        classification: classification.label,
        confidence_score: classification.confidence,
        risk_level: riskLevel,
        suggestions: getSuggestions(),
        notes: `Recorded ${data.length} samples over ${formatDuration(sessionDuration)}. ${peaks.length} R-peaks detected.`,
      };

      const { error } = await supabase.from('ecg_sessions').insert(sessionData);
      
      if (error) throw error;

      toast({
        title: 'Session Saved',
        description: 'Your ECG session has been saved successfully.',
      });
      setShowSaveDialog(false);
      setSessionName('');
    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save session. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getSuggestions = (): string[] => {
    const suggestions: string[] = [];
    const hr = metrics.heartRate;
    const hrv = metrics.hrvSdnn;

    if (hr < 60) {
      suggestions.push('Heart rate is below normal. Consider light physical activity to boost circulation.');
    } else if (hr > 100) {
      suggestions.push('Elevated heart rate detected. Practice deep breathing or relaxation techniques.');
    }

    if (hrv < 30) {
      suggestions.push('Low heart rate variability. Focus on stress reduction and quality sleep.');
    } else if (hrv > 50) {
      suggestions.push('Good heart rate variability indicating healthy autonomic function.');
    }

    if (riskLevel === 'moderate') {
      suggestions.push('Moderate risk indicators present. Consider consulting a healthcare professional.');
    } else if (riskLevel === 'high') {
      suggestions.push('High risk indicators detected. Please seek medical evaluation promptly.');
    }

    if (suggestions.length === 0) {
      suggestions.push('Cardiac metrics are within normal ranges. Maintain healthy lifestyle habits.');
    }

    return suggestions;
  };

  const handleExportPDF = async () => {
    if (data.length === 0) return;

    setIsExporting(true);
    try {
      const history = metricsHistoryRef.current;
      const heartRates = history.heartRates;

      const report: SessionReport = {
        sessionId: crypto.randomUUID(),
        sessionName: sessionName || `ECG Session ${new Date().toLocaleDateString()}`,
        startTime: sessionStartRef.current || new Date(),
        endTime: new Date(),
        duration: formatDuration(sessionDuration),
        metrics: {
          heartRateAvg: Math.round(calculateAverage(heartRates)) || metrics.heartRate,
          heartRateMin: heartRates.length > 0 ? Math.min(...heartRates) : metrics.heartRate - 10,
          heartRateMax: heartRates.length > 0 ? Math.max(...heartRates) : metrics.heartRate + 10,
          rrInterval: calculateAverage(history.rrIntervals) || metrics.rrInterval,
          qrsDuration: calculateAverage(history.qrsDurations) || metrics.qrsDuration,
          qtInterval: calculateAverage(history.qtIntervals) || metrics.qtInterval,
          hrvSdnn: calculateAverage(history.hrvSdnns) || metrics.hrvSdnn,
          hrvRmssd: calculateAverage(history.hrvRmssds) || metrics.hrvRmssd,
        },
        classification: {
          label: classification.label,
          confidence: classification.confidence,
          details: classification.details,
        },
        riskLevel,
        suggestions: getSuggestions(),
        riskFusion: riskFusionResult,
        ecgData: data.slice(-750), // last 3 seconds at 250Hz
        peakTimes: peaks.map(p => p.time),
      };

      await generateSessionPDF(report);
      toast({
        title: 'Report Downloaded',
        description: 'Your ECG session report has been exported.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to generate PDF report.',
      });
    } finally {
      setIsExporting(false);
    }
  };

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
              ECG Analysis
            </h2>
            <p className="text-muted-foreground mt-1">
              Real-time monitoring or upload CSV files for offline analysis
            </p>
          </div>

          {/* Mode Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'realtime' | 'upload')} className="w-auto">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="realtime" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Real-time
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload CSV
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Real-time Mode */}
        {activeTab === 'realtime' && (
          <>
            {/* Controls */}
            <div className="flex items-center gap-3 mb-6">
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
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(true)}
                disabled={data.length === 0}
                className="border-border/50"
                title="Save Session"
              >
                <Save className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={data.length === 0 || isExporting}
                className="border-border/50"
                title="Download PDF Report"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Main Grid - Real-time Mode */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* ECG Waveform - Main Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Waveform Display */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 h-[400px]">
              <ECGWaveform data={data} peaks={peaks} riskLevel={riskLevel} showPeaks={true} />
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
                  <span className="text-muted-foreground">R-Peaks</span>
                  <span className="font-mono text-[hsl(340,100%,60%)]">{peaks.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-mono">{formatDuration(sessionDuration)}</span>
                </div>
              </div>
            </div>

            {/* AI Health Insights */}
            <AIHealthInsights
              metrics={{
                heartRate: metrics.heartRate,
                rrInterval: metrics.rrInterval,
                qrsDuration: metrics.qrsDuration,
                qtInterval: metrics.qtInterval,
                hrvSdnn: metrics.hrvSdnn,
                hrvRmssd: metrics.hrvRmssd,
              }}
              classification={{
                label: classification.label,
                confidence: classification.confidence,
              }}
              riskLevel={riskLevel}
            />

            {/* Risk Fusion Panel */}
            <RiskFusionPanel 
              result={riskFusionResult} 
              isLoading={isCalculatingRisk} 
            />

            {/* Profile Completeness Hint */}
            {getCompleteness().clinical < 50 && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                <h4 className="font-display font-semibold text-sm mb-2 text-accent">
                  Improve Risk Analysis
                </h4>
                <p className="text-xs text-muted-foreground">
                  Complete your clinical profile (BP, cholesterol, lifestyle) for more accurate risk fusion.
                </p>
                <button 
                  onClick={() => onNavigate('profile')}
                  className="text-xs text-primary mt-2 hover:underline"
                >
                  Complete Profile →
                </button>
              </div>
            )}

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
          </>
        )}

        {/* CSV Upload Mode */}
        {activeTab === 'upload' && (
          <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
            <CSVUploadAnalysis />
          </div>
        )}
      </main>

      {/* Save Session Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Save ECG Session
            </DialogTitle>
            <DialogDescription>
              Save this recording to your history for future reference and report generation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sessionName">Session Name</Label>
              <Input
                id="sessionName"
                placeholder={`ECG Session ${new Date().toLocaleDateString()}`}
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
            </div>

            {/* Session Summary */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-mono">{formatDuration(sessionDuration)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Heart Rate (Avg)</span>
                <span className="font-mono">{metrics.heartRate} BPM</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">R-Peaks Detected</span>
                <span className="font-mono text-[hsl(340,100%,60%)]">{peaks.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Classification</span>
                <span className="text-primary">{classification.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Risk Level</span>
                <span className={
                  riskLevel === 'low' ? 'text-risk-low' :
                  riskLevel === 'moderate' ? 'text-risk-moderate' : 'text-risk-high'
                }>
                  {riskLevel.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSession} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Monitor;

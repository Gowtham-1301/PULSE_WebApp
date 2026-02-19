import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp, ArrowRight, Loader2, FileDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateSessionPDF, generateComparisonPDF, SessionReport, ComparisonReport } from '@/lib/pdfExport';

interface ReportsProps {
  onNavigate: (page: string) => void;
}

interface ECGSession {
  id: string;
  session_name: string | null;
  start_time: string;
  end_time: string | null;
  heart_rate_avg: number | null;
  heart_rate_min: number | null;
  heart_rate_max: number | null;
  rr_interval_avg: number | null;
  qrs_duration_avg: number | null;
  qt_interval_avg: number | null;
  hrv_sdnn: number | null;
  hrv_rmssd: number | null;
  classification: string | null;
  confidence_score: number | null;
  risk_level: string | null;
  suggestions: string[] | null;
  notes: string | null;
}

const Reports = ({ onNavigate }: ReportsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ECGSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [comparisonSessions, setComparisonSessions] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingSessionId, setExportingSessionId] = useState<string | null>(null);
  const [previewSession, setPreviewSession] = useState<ECGSession | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('ecg_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('start_time', { ascending: false })
          .limit(50);

        if (error) throw error;
        setSessions(data || []);
        if (data && data.length > 0) {
          setSelectedSession(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load sessions',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [user, toast]);

  const convertToSessionReport = (session: ECGSession): SessionReport => {
    const startTime = new Date(session.start_time);
    const endTime = session.end_time ? new Date(session.end_time) : new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMins = Math.floor(durationMs / 60000);
    const durationSecs = Math.floor((durationMs % 60000) / 1000);

    return {
      sessionId: session.id,
      sessionName: session.session_name || 'ECG Session',
      startTime,
      endTime: session.end_time ? endTime : undefined,
      duration: `${durationMins}:${durationSecs.toString().padStart(2, '0')}`,
      metrics: {
        heartRateAvg: session.heart_rate_avg || 72,
        heartRateMin: session.heart_rate_min || 60,
        heartRateMax: session.heart_rate_max || 90,
        rrInterval: session.rr_interval_avg || 0.833,
        qrsDuration: session.qrs_duration_avg || 0.08,
        qtInterval: session.qt_interval_avg || 0.36,
        hrvSdnn: session.hrv_sdnn || 45,
        hrvRmssd: session.hrv_rmssd || 35,
      },
      classification: {
        label: session.classification || 'Normal Sinus Rhythm',
        confidence: session.confidence_score || 94,
        details: session.notes || 'AI-analyzed cardiac rhythm classification',
      },
      riskLevel: (session.risk_level as 'low' | 'moderate' | 'high') || 'low',
      suggestions: session.suggestions || [],
      // ecgData and riskFusion not stored in DB — waveform will show "no data" placeholder
    };
  };

  const handleExportSession = async (sessionId?: string) => {
    const targetId = sessionId || selectedSession;
    if (!targetId) return;

    const session = sessions.find(s => s.id === targetId);
    if (!session) return;

    setExportingSessionId(targetId);
    try {
      const report = convertToSessionReport(session);
      await generateSessionPDF(report);
      toast({
        title: 'Report Downloaded',
        description: `ECG report for ${session.session_name || 'session'} has been downloaded.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to generate PDF report.',
      });
    } finally {
      setExportingSessionId(null);
    }
  };

  const handleExportComparison = async () => {
    if (comparisonSessions.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Select Sessions',
        description: 'Please select at least 2 sessions to compare.',
      });
      return;
    }

    setIsExporting(true);
    try {
      const selectedSessionsData = comparisonSessions
        .map(id => sessions.find(s => s.id === id))
        .filter(Boolean) as ECGSession[];

      const comparison: ComparisonReport = {
        currentSession: convertToSessionReport(selectedSessionsData[0]),
        previousSessions: selectedSessionsData.slice(1).map(convertToSessionReport),
      };

      await generateComparisonPDF(comparison);
      toast({
        title: 'Comparison Report Downloaded',
        description: 'Your comparison report has been downloaded.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to generate comparison report.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleComparisonSession = (sessionId: string) => {
    setComparisonSessions(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      }
      if (prev.length >= 4) {
        toast({
          title: 'Maximum Sessions',
          description: 'You can compare up to 4 sessions at once.',
        });
        return prev;
      }
      return [...prev, sessionId];
    });
  };

  const getSelectedSessionDetails = () => {
    return sessions.find(s => s.id === selectedSession);
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const mins = Math.floor(durationMs / 60000);
    const secs = Math.floor((durationMs % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-cyber flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-cyber">
      <Header onNavigate={onNavigate} currentPage="reports" />

      <main className="container py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold flex items-center gap-3">
              <FileText className="w-7 h-7 text-primary" />
              Reports & Export
            </h2>
            <p className="text-muted-foreground mt-1">
              Generate and download PDF reports of your ECG sessions
            </p>
          </div>

          {sessions.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">No Sessions Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start recording ECG sessions to generate reports
              </p>
              <Button onClick={() => onNavigate('monitor')} className="glow-primary">
                Start Recording
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Single Session Export */}
              <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg">Session Report</h3>
                    <p className="text-sm text-muted-foreground">Export a single session</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Select Session
                    </label>
                    <Select value={selectedSession} onValueChange={setSelectedSession}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Choose a session" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.session_name || new Date(session.start_time).toLocaleDateString()}
                            {' - '}
                            {session.classification || 'Unknown'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Session Preview */}
                  {getSelectedSessionDetails() && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/30 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date</span>
                        <span>{new Date(getSelectedSessionDetails()!.start_time).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-mono">
                          {formatDuration(getSelectedSessionDetails()!.start_time, getSelectedSessionDetails()!.end_time)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Heart Rate</span>
                        <span>{getSelectedSessionDetails()!.heart_rate_avg || '--'} BPM</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Classification</span>
                        <span className="text-primary">{getSelectedSessionDetails()!.classification || 'Normal'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Confidence</span>
                        <span>{(getSelectedSessionDetails()!.confidence_score || 0).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Risk Level</span>
                        <span className={
                          getSelectedSessionDetails()!.risk_level === 'low' ? 'text-risk-low' :
                          getSelectedSessionDetails()!.risk_level === 'moderate' ? 'text-risk-moderate' : 'text-risk-high'
                        }>
                          {(getSelectedSessionDetails()!.risk_level || 'low').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => handleExportSession()}
                    disabled={!selectedSession || exportingSessionId === selectedSession}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {exportingSessionId === selectedSession ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download Session PDF
                  </Button>
                </div>
              </div>

              {/* Comparison Export */}
              <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg">Comparison Report</h3>
                    <p className="text-sm text-muted-foreground">Compare multiple sessions</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Select Sessions to Compare (2-4)
                    </label>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {sessions.slice(0, 10).map((session) => (
                        <div
                          key={session.id}
                          onClick={() => toggleComparisonSession(session.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            comparisonSessions.includes(session.id)
                              ? 'border-accent bg-accent/10'
                              : 'border-border/30 bg-muted/20 hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                comparisonSessions.includes(session.id) ? 'bg-accent' : 'bg-muted-foreground/30'
                              }`} />
                              <div>
                                <p className="text-sm font-medium">
                                  {session.session_name || 'Session'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(session.start_time).toLocaleDateString()} • {session.heart_rate_avg || '--'} BPM
                                </p>
                              </div>
                            </div>
                            <span className={`text-xs ${
                              session.risk_level === 'low' ? 'text-risk-low' :
                              session.risk_level === 'moderate' ? 'text-risk-moderate' : 'text-risk-high'
                            }`}>
                              {session.classification || 'Normal'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {comparisonSessions.length} of 4 sessions selected
                  </div>

                  <Button
                    onClick={handleExportComparison}
                    disabled={comparisonSessions.length < 2 || isExporting}
                    className="w-full bg-accent hover:bg-accent/90"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download Comparison PDF
                  </Button>
                </div>
              </div>

              {/* Recent Sessions List with Quick Download */}
              <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-semibold text-lg">Recent Sessions</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{sessions.length} total sessions</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-muted-foreground border-b border-border/30">
                        <th className="pb-3 pr-4">Session</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Duration</th>
                        <th className="pb-3 pr-4">Heart Rate</th>
                        <th className="pb-3 pr-4">Classification</th>
                        <th className="pb-3 pr-4">Risk</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id} className="border-b border-border/20 hover:bg-muted/20">
                          <td className="py-3 pr-4 text-sm font-medium">
                            {session.session_name || 'ECG Session'}
                          </td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">
                            {new Date(session.start_time).toLocaleDateString()}
                          </td>
                          <td className="py-3 pr-4 text-sm font-mono">
                            {formatDuration(session.start_time, session.end_time)}
                          </td>
                          <td className="py-3 pr-4 text-sm font-mono">
                            {session.heart_rate_avg || '--'} BPM
                          </td>
                          <td className="py-3 pr-4 text-sm text-primary">
                            {session.classification || 'Normal'}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              session.risk_level === 'low' ? 'bg-risk-low/20 text-risk-low' :
                              session.risk_level === 'moderate' ? 'bg-risk-moderate/20 text-risk-moderate' :
                              'bg-risk-high/20 text-risk-high'
                            }`}>
                              {(session.risk_level || 'low').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPreviewSession(session)}
                                className="h-8 w-8 p-0"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleExportSession(session.id)}
                                disabled={exportingSessionId === session.id}
                                className="h-8 w-8 p-0"
                                title="Download PDF"
                              >
                                {exportingSessionId === session.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <FileDown className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewSession} onOpenChange={() => setPreviewSession(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Session Details
            </DialogTitle>
            <DialogDescription>
              {previewSession?.session_name || 'ECG Session'} - {previewSession && new Date(previewSession.start_time).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {previewSession && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs text-muted-foreground">Heart Rate (Avg)</p>
                  <p className="text-lg font-mono font-bold text-primary">{previewSession.heart_rate_avg || '--'} <span className="text-xs">BPM</span></p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs text-muted-foreground">Heart Rate (Min/Max)</p>
                  <p className="text-lg font-mono font-bold">{previewSession.heart_rate_min || '--'}/{previewSession.heart_rate_max || '--'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs text-muted-foreground">HRV SDNN</p>
                  <p className="text-lg font-mono font-bold">{previewSession.hrv_sdnn?.toFixed(1) || '--'} <span className="text-xs">ms</span></p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs text-muted-foreground">HRV RMSSD</p>
                  <p className="text-lg font-mono font-bold">{previewSession.hrv_rmssd?.toFixed(1) || '--'} <span className="text-xs">ms</span></p>
                </div>
              </div>

              {/* Classification */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">AI Classification</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    previewSession.risk_level === 'low' ? 'bg-risk-low/20 text-risk-low' :
                    previewSession.risk_level === 'moderate' ? 'bg-risk-moderate/20 text-risk-moderate' :
                    'bg-risk-high/20 text-risk-high'
                  }`}>
                    {(previewSession.risk_level || 'low').toUpperCase()} RISK
                  </span>
                </div>
                <p className="text-xl font-display font-bold text-primary">{previewSession.classification || 'Normal Sinus Rhythm'}</p>
                <p className="text-sm text-muted-foreground mt-1">Confidence: {(previewSession.confidence_score || 0).toFixed(1)}%</p>
              </div>

              {/* Interval Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground">RR Interval</p>
                  <p className="font-mono">{previewSession.rr_interval_avg?.toFixed(3) || '--'} sec</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground">QRS Duration</p>
                  <p className="font-mono">{previewSession.qrs_duration_avg?.toFixed(3) || '--'} sec</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground">QT Interval</p>
                  <p className="font-mono">{previewSession.qt_interval_avg?.toFixed(3) || '--'} sec</p>
                </div>
              </div>

              {/* Suggestions */}
              {previewSession.suggestions && previewSession.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Recommendations</p>
                  <ul className="space-y-1">
                    {previewSession.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Download Button */}
              <Button
                onClick={() => {
                  handleExportSession(previewSession.id);
                  setPreviewSession(null);
                }}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Full PDF Report
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;

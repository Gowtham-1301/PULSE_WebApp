import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
}

const Reports = ({ onNavigate }: ReportsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ECGSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [comparisonSessions, setComparisonSessions] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

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
        details: 'AI-analyzed cardiac rhythm classification',
      },
      riskLevel: (session.risk_level as 'low' | 'moderate' | 'high') || 'low',
      suggestions: session.suggestions || [],
    };
  };

  const handleExportSession = async () => {
    if (!selectedSession) return;

    const session = sessions.find(s => s.id === selectedSession);
    if (!session) return;

    setIsExporting(true);
    try {
      const report = convertToSessionReport(session);
      await generateSessionPDF(report);
      toast({
        title: 'Report Exported',
        description: 'Your ECG session report has been downloaded.',
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
        title: 'Comparison Report Exported',
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
                        <span className="text-muted-foreground">Heart Rate</span>
                        <span>{getSelectedSessionDetails()!.heart_rate_avg || '--'} BPM</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Classification</span>
                        <span className="text-primary">{getSelectedSessionDetails()!.classification || 'Normal'}</span>
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
                    onClick={handleExportSession}
                    disabled={!selectedSession || isExporting}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Export Session PDF
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
                                  {new Date(session.start_time).toLocaleDateString()}
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
                    Export Comparison PDF
                  </Button>
                </div>
              </div>

              {/* Recent Sessions List */}
              <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold text-lg">Recent Sessions</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-muted-foreground border-b border-border/30">
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Heart Rate</th>
                        <th className="pb-3 pr-4">Classification</th>
                        <th className="pb-3 pr-4">Risk</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.slice(0, 10).map((session) => (
                        <tr key={session.id} className="border-b border-border/20 hover:bg-muted/20">
                          <td className="py-3 pr-4 text-sm">
                            {new Date(session.start_time).toLocaleDateString()}
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedSession(session.id);
                                handleExportSession();
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
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
    </div>
  );
};

export default Reports;

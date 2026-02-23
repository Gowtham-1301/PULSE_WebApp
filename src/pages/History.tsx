import { useState } from 'react';
import { Calendar, Clock, Heart, Download, ChevronRight, Filter, Trash2, Loader2 } from 'lucide-react';
import SessionTrendCharts from '@/components/ecg/SessionTrendCharts';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import RiskIndicator from '@/components/ecg/RiskIndicator';
import { cn } from '@/lib/utils';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface HistoryProps {
  onNavigate: (page: string) => void;
}

const History = ({ onNavigate }: HistoryProps) => {
  const { user } = useAuth();
  const { sessions, loading, deleteSession } = useSessionHistory();
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredSessions = filterRisk
    ? sessions.filter(s => s.risk_level === filterRisk)
    : sessions;

  const getRiskColor = (risk: string | null) => {
    switch (risk) {
      case 'low': return 'text-risk-low';
      case 'moderate': return 'text-risk-moderate';
      case 'high': return 'text-risk-high';
      default: return 'text-muted-foreground';
    }
  };

  const formatSessionDuration = (start: string, end: string | null) => {
    if (!end) return '--:--';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    const { error } = await deleteSession(id);
    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
    } else {
      toast({ title: 'Session deleted' });
      if (selectedSession === id) setSelectedSession(null);
    }
    setDeletingId(null);
  };

  const avgHeartRate = sessions.length > 0
    ? Math.round(sessions.reduce((a, s) => a + (Number(s.heart_rate_avg) || 0), 0) / sessions.filter(s => s.heart_rate_avg).length || 0)
    : 0;

  if (!user) {
    return (
      <div className="min-h-screen gradient-cyber">
        <Header onNavigate={onNavigate} currentPage="history" />
        <main className="container py-16 text-center">
          <p className="text-muted-foreground text-lg">Please sign in to view your session history.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-cyber">
      <Header onNavigate={onNavigate} currentPage="history" />

      <main className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold">Session History</h2>
            <p className="text-muted-foreground mt-1">Review and analyze your past ECG recordings</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {[null, 'low', 'moderate', 'high'].map((risk) => (
              <Button
                key={risk ?? 'all'}
                variant="ghost"
                size="sm"
                className={cn(
                  'text-sm',
                  filterRisk === risk && (risk === null ? 'bg-primary/10 text-primary' : `bg-risk-${risk}/10 text-risk-${risk}`)
                )}
                onClick={() => setFilterRisk(risk)}
              >
                {risk === null ? 'All' : risk === 'low' ? 'Low Risk' : risk === 'moderate' ? 'Moderate' : 'High Risk'}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border border-border/50 bg-card/80 p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Sessions</p>
            <p className="text-2xl font-display font-bold">{sessions.length}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/80 p-4">
            <p className="text-sm text-muted-foreground mb-1">Avg Heart Rate</p>
            <p className="text-2xl font-display font-bold text-primary">{avgHeartRate || '--'} BPM</p>
          </div>
          <div className="rounded-lg border border-risk-low/30 bg-risk-low/5 p-4">
            <p className="text-sm text-muted-foreground mb-1">Normal Sessions</p>
            <p className="text-2xl font-display font-bold text-risk-low">
              {sessions.filter(s => s.risk_level === 'low').length}
            </p>
          </div>
          <div className="rounded-lg border border-risk-moderate/30 bg-risk-moderate/5 p-4">
            <p className="text-sm text-muted-foreground mb-1">Flagged Sessions</p>
            <p className="text-2xl font-display font-bold text-risk-moderate">
              {sessions.filter(s => s.risk_level && s.risk_level !== 'low').length}
            </p>
          </div>
        </div>

        {/* Trend Charts */}
        {!loading && sessions.length >= 2 && (
          <SessionTrendCharts sessions={sessions} />
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Sessions List */}
        {!loading && (
          <div className="space-y-4">
            {filteredSessions.map((session) => {
              const riskLevel = (session.risk_level as 'low' | 'moderate' | 'high') || 'low';
              return (
                <div
                  key={session.id}
                  className={cn(
                    'rounded-xl border bg-card/80 backdrop-blur-sm transition-all duration-300 cursor-pointer',
                    selectedSession === session.id
                      ? 'border-primary/50 glow-primary'
                      : 'border-border/50 hover:border-primary/30'
                  )}
                  onClick={() => setSelectedSession(session.id === selectedSession ? null : session.id)}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-muted/50">
                        <Calendar className="w-4 h-4 text-primary mb-1" />
                        <span className="text-xs font-mono">{format(new Date(session.start_time), 'MM/dd')}</span>
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-lg">
                          {session.session_name || session.classification || 'ECG Session'}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(session.start_time), 'hh:mm a')}
                          </span>
                          {session.heart_rate_avg && (
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {Math.round(Number(session.heart_rate_avg))} BPM
                            </span>
                          )}
                          <span>Duration: {formatSessionDuration(session.start_time, session.end_time)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className={cn('font-mono font-bold', getRiskColor(session.risk_level))}>
                          {session.confidence_score ? `${Number(session.confidence_score).toFixed(1)}%` : '--'}
                        </p>
                      </div>
                      <div className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
                        riskLevel === 'low' && 'bg-risk-low/10 text-risk-low',
                        riskLevel === 'moderate' && 'bg-risk-moderate/10 text-risk-moderate',
                        riskLevel === 'high' && 'bg-risk-high/10 text-risk-high'
                      )}>
                        {riskLevel}
                      </div>
                      <ChevronRight className={cn(
                        'w-5 h-5 text-muted-foreground transition-transform duration-300',
                        selectedSession === session.id && 'rotate-90'
                      )} />
                    </div>
                  </div>

                  {selectedSession === session.id && (
                    <div className="border-t border-border/30 p-4 animate-fade-in-up">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-display font-semibold text-sm mb-3 uppercase tracking-wider">Session Details</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Heart Rate (Avg)</span>
                              <span className="font-mono">{session.heart_rate_avg ? `${Math.round(Number(session.heart_rate_avg))} BPM` : '--'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">HR Range</span>
                              <span className="font-mono">
                                {session.heart_rate_min && session.heart_rate_max
                                  ? `${Math.round(Number(session.heart_rate_min))} – ${Math.round(Number(session.heart_rate_max))} BPM`
                                  : '--'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Duration</span>
                              <span className="font-mono">{formatSessionDuration(session.start_time, session.end_time)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Classification</span>
                              <span className="text-primary">{session.classification || '--'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Confidence</span>
                              <span className="font-mono">{session.confidence_score ? `${Number(session.confidence_score).toFixed(1)}%` : '--'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">HRV (SDNN)</span>
                              <span className="font-mono">{session.hrv_sdnn ? `${Number(session.hrv_sdnn).toFixed(1)} ms` : '--'}</span>
                            </div>
                            {session.notes && (
                              <div className="pt-2 border-t border-border/30">
                                <span className="text-muted-foreground">Notes</span>
                                <p className="mt-1 text-xs">{session.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <RiskIndicator level={riskLevel} size="sm" />

                          {session.suggestions && session.suggestions.length > 0 && (
                            <div className="mt-4">
                              <h5 className="font-display font-semibold text-sm mb-2 uppercase tracking-wider">Suggestions</h5>
                              <ul className="space-y-1 text-xs text-muted-foreground">
                                {session.suggestions.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Export Report
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleDelete(session.id, e)}
                              disabled={deletingId === session.id}
                            >
                              {deletingId === session.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredSessions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {sessions.length === 0
                ? 'No sessions recorded yet. Start a recording in the Live Monitor to see your history here.'
                : 'No sessions found with the selected filter.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default History;

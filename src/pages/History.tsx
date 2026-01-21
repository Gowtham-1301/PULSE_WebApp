import { useState } from 'react';
import { Calendar, Clock, Heart, Download, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import RiskIndicator from '@/components/ecg/RiskIndicator';
import { cn } from '@/lib/utils';

interface HistoryProps {
  onNavigate: (page: string) => void;
}

// Mock history data
const mockSessions = [
  {
    id: '1',
    date: '2026-01-21',
    time: '09:30 AM',
    duration: '12:34',
    heartRateAvg: 72,
    classification: 'Normal Sinus Rhythm',
    confidence: 94.5,
    riskLevel: 'low' as const,
  },
  {
    id: '2',
    date: '2026-01-20',
    time: '08:15 AM',
    duration: '15:22',
    heartRateAvg: 78,
    classification: 'Normal Sinus Rhythm',
    confidence: 92.1,
    riskLevel: 'low' as const,
  },
  {
    id: '3',
    date: '2026-01-19',
    time: '10:00 AM',
    duration: '08:45',
    heartRateAvg: 85,
    classification: 'Sinus Tachycardia',
    confidence: 87.3,
    riskLevel: 'moderate' as const,
  },
  {
    id: '4',
    date: '2026-01-18',
    time: '07:45 AM',
    duration: '20:00',
    heartRateAvg: 68,
    classification: 'Normal Sinus Rhythm',
    confidence: 96.2,
    riskLevel: 'low' as const,
  },
  {
    id: '5',
    date: '2026-01-17',
    time: '09:00 AM',
    duration: '11:15',
    heartRateAvg: 75,
    classification: 'Normal Sinus Rhythm',
    confidence: 93.8,
    riskLevel: 'low' as const,
  },
];

const History = ({ onNavigate }: HistoryProps) => {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);

  const filteredSessions = filterRisk
    ? mockSessions.filter(s => s.riskLevel === filterRisk)
    : mockSessions;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-risk-low';
      case 'moderate':
        return 'text-risk-moderate';
      case 'high':
        return 'text-risk-high';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen gradient-cyber">
      <Header onNavigate={onNavigate} currentPage="history" />

      <main className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold">Session History</h2>
            <p className="text-muted-foreground mt-1">
              Review and analyze your past ECG recordings
            </p>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'text-sm',
                !filterRisk && 'bg-primary/10 text-primary'
              )}
              onClick={() => setFilterRisk(null)}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'text-sm',
                filterRisk === 'low' && 'bg-risk-low/10 text-risk-low'
              )}
              onClick={() => setFilterRisk('low')}
            >
              Low Risk
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'text-sm',
                filterRisk === 'moderate' && 'bg-risk-moderate/10 text-risk-moderate'
              )}
              onClick={() => setFilterRisk('moderate')}
            >
              Moderate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'text-sm',
                filterRisk === 'high' && 'bg-risk-high/10 text-risk-high'
              )}
              onClick={() => setFilterRisk('high')}
            >
              High Risk
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border border-border/50 bg-card/80 p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Sessions</p>
            <p className="text-2xl font-display font-bold">{mockSessions.length}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/80 p-4">
            <p className="text-sm text-muted-foreground mb-1">Avg Heart Rate</p>
            <p className="text-2xl font-display font-bold text-primary">
              {Math.round(mockSessions.reduce((a, b) => a + b.heartRateAvg, 0) / mockSessions.length)} BPM
            </p>
          </div>
          <div className="rounded-lg border border-risk-low/30 bg-risk-low/5 p-4">
            <p className="text-sm text-muted-foreground mb-1">Normal Sessions</p>
            <p className="text-2xl font-display font-bold text-risk-low">
              {mockSessions.filter(s => s.riskLevel === 'low').length}
            </p>
          </div>
          <div className="rounded-lg border border-risk-moderate/30 bg-risk-moderate/5 p-4">
            <p className="text-sm text-muted-foreground mb-1">Flagged Sessions</p>
            <p className="text-2xl font-display font-bold text-risk-moderate">
              {mockSessions.filter(s => s.riskLevel !== 'low').length}
            </p>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {filteredSessions.map((session) => (
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
              {/* Session Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  {/* Date/Time */}
                  <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-muted/50">
                    <Calendar className="w-4 h-4 text-primary mb-1" />
                    <span className="text-xs font-mono">{session.date.split('-').slice(1).join('/')}</span>
                  </div>

                  {/* Session Info */}
                  <div>
                    <h4 className="font-display font-semibold text-lg">
                      {session.classification}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {session.heartRateAvg} BPM
                      </span>
                      <span>Duration: {session.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className={cn('font-mono font-bold', getRiskColor(session.riskLevel))}>
                      {session.confidence}%
                    </p>
                  </div>
                  
                  <div className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
                    session.riskLevel === 'low' && 'bg-risk-low/10 text-risk-low',
                    session.riskLevel === 'moderate' && 'bg-risk-moderate/10 text-risk-moderate'
                  )}>
                    {session.riskLevel}
                  </div>

                  <ChevronRight className={cn(
                    'w-5 h-5 text-muted-foreground transition-transform duration-300',
                    selectedSession === session.id && 'rotate-90'
                  )} />
                </div>
              </div>

              {/* Expanded Details */}
              {selectedSession === session.id && (
                <div className="border-t border-border/30 p-4 animate-fade-in-up">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-display font-semibold text-sm mb-3 uppercase tracking-wider">
                        Session Details
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Heart Rate (Avg)</span>
                          <span className="font-mono">{session.heartRateAvg} BPM</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-mono">{session.duration}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Classification</span>
                          <span className="text-primary">{session.classification}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Confidence</span>
                          <span className="font-mono">{session.confidence}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <RiskIndicator level={session.riskLevel} size="sm" />
                      
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Report
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredSessions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No sessions found with the selected filter.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default History;

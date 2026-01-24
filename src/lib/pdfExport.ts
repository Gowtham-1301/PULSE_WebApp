import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface SessionReport {
  sessionId: string;
  sessionName: string;
  startTime: Date;
  endTime?: Date;
  duration: string;
  metrics: {
    heartRateAvg: number;
    heartRateMin: number;
    heartRateMax: number;
    rrInterval: number;
    qrsDuration: number;
    qtInterval: number;
    hrvSdnn: number;
    hrvRmssd: number;
  };
  classification: {
    label: string;
    confidence: number;
    details: string;
  };
  riskLevel: 'low' | 'moderate' | 'high';
  suggestions: string[];
  waveformElementId?: string;
}

export interface ComparisonReport {
  currentSession: SessionReport;
  previousSessions: SessionReport[];
}

const COLORS = {
  primary: '#14b8a6',
  secondary: '#ec4899',
  background: '#0a0f1a',
  card: '#1a1f2e',
  text: '#ffffff',
  muted: '#94a3b8',
  riskLow: '#22c55e',
  riskModerate: '#eab308',
  riskHigh: '#ef4444',
};

export const generateSessionPDF = async (report: SessionReport): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Header
  pdf.setFillColor(10, 15, 26);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Title
  pdf.setTextColor(20, 184, 166);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ECG Session Report', margin, yPos + 10);
  yPos += 20;

  // Session info
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Session: ${report.sessionName || 'Unnamed Session'}`, margin, yPos);
  yPos += 7;
  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(10);
  pdf.text(`Date: ${report.startTime.toLocaleDateString()} at ${report.startTime.toLocaleTimeString()}`, margin, yPos);
  yPos += 5;
  pdf.text(`Duration: ${report.duration}`, margin, yPos);
  yPos += 15;

  // Waveform snapshot
  if (report.waveformElementId) {
    const waveformElement = document.getElementById(report.waveformElementId);
    if (waveformElement) {
      try {
        const canvas = await html2canvas(waveformElement, {
          backgroundColor: '#0a0f1a',
          scale: 2,
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        
        pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, Math.min(imgHeight, 60));
        yPos += Math.min(imgHeight, 60) + 10;
      } catch (e) {
        console.error('Failed to capture waveform:', e);
      }
    }
  }

  // Classification section
  pdf.setDrawColor(20, 184, 166);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  pdf.setTextColor(20, 184, 166);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('AI Classification', margin, yPos);
  yPos += 8;

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.text(report.classification.label, margin, yPos);
  yPos += 7;

  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(10);
  pdf.text(`Confidence: ${report.classification.confidence.toFixed(1)}%`, margin, yPos);
  yPos += 5;
  pdf.text(report.classification.details, margin, yPos);
  yPos += 15;

  // Metrics grid
  pdf.setTextColor(20, 184, 166);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Vital Metrics', margin, yPos);
  yPos += 10;

  const metricsData = [
    ['Heart Rate (avg)', `${report.metrics.heartRateAvg} BPM`],
    ['Heart Rate (min)', `${report.metrics.heartRateMin} BPM`],
    ['Heart Rate (max)', `${report.metrics.heartRateMax} BPM`],
    ['RR Interval', `${report.metrics.rrInterval.toFixed(3)} sec`],
    ['QRS Duration', `${report.metrics.qrsDuration.toFixed(3)} sec`],
    ['QT Interval', `${report.metrics.qtInterval.toFixed(3)} sec`],
    ['HRV SDNN', `${report.metrics.hrvSdnn.toFixed(1)} ms`],
    ['HRV RMSSD', `${report.metrics.hrvRmssd.toFixed(1)} ms`],
  ];

  pdf.setFontSize(10);
  const colWidth = (pageWidth - margin * 2) / 2;
  let col = 0;
  let startY = yPos;

  metricsData.forEach((row, idx) => {
    const x = margin + col * colWidth;
    const y = startY + Math.floor(idx / 2) * 8;
    
    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    pdf.text(row[0], x, y);
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(row[1], x + 45, y);
    
    col = (col + 1) % 2;
  });
  yPos = startY + Math.ceil(metricsData.length / 2) * 8 + 10;

  // Risk level
  pdf.setDrawColor(20, 184, 166);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  pdf.setTextColor(20, 184, 166);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Risk Assessment', margin, yPos);
  yPos += 8;

  const riskColor = report.riskLevel === 'low' ? COLORS.riskLow :
                    report.riskLevel === 'moderate' ? COLORS.riskModerate : COLORS.riskHigh;
  
  pdf.setTextColor(riskColor);
  pdf.setFontSize(16);
  pdf.text(report.riskLevel.toUpperCase(), margin, yPos);
  yPos += 15;

  // Suggestions
  if (report.suggestions.length > 0) {
    pdf.setTextColor(20, 184, 166);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recommendations', margin, yPos);
    yPos += 8;

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    report.suggestions.forEach((suggestion) => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.text(`• ${suggestion}`, margin, yPos);
      yPos += 6;
    });
  }

  // Disclaimer
  yPos = pageHeight - 25;
  pdf.setDrawColor(234, 179, 8);
  pdf.setLineWidth(0.3);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;
  
  pdf.setTextColor(234, 179, 8);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DISCLAIMER', margin, yPos);
  yPos += 4;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    'This report is for educational and decision-support purposes only. It is not intended to diagnose,',
    margin, yPos
  );
  yPos += 4;
  pdf.text(
    'treat, or replace professional medical advice. Always consult a healthcare provider for medical concerns.',
    margin, yPos
  );

  // Save
  const fileName = `ECG_Report_${report.startTime.toISOString().split('T')[0]}_${report.sessionId.slice(0, 8)}.pdf`;
  pdf.save(fileName);
};

export const generateComparisonPDF = async (comparison: ComparisonReport): Promise<void> => {
  const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for comparison
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Header
  pdf.setFillColor(10, 15, 26);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  pdf.setTextColor(20, 184, 166);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ECG Session Comparison Report', margin, yPos + 10);
  yPos += 25;

  // Comparison table header
  const sessions = [comparison.currentSession, ...comparison.previousSessions.slice(0, 3)];
  const colWidth = (pageWidth - margin * 2) / (sessions.length + 1);
  
  pdf.setFontSize(10);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Metric', margin, yPos);
  
  sessions.forEach((session, idx) => {
    const x = margin + (idx + 1) * colWidth;
    pdf.setTextColor(idx === 0 ? 20 : 148, idx === 0 ? 184 : 163, idx === 0 ? 166 : 184);
    const dateStr = session.startTime.toLocaleDateString();
    pdf.text(idx === 0 ? `Current (${dateStr})` : dateStr, x, yPos);
  });
  yPos += 10;

  // Comparison rows
  const metrics = [
    { label: 'Heart Rate (avg)', key: 'heartRateAvg', unit: 'BPM' },
    { label: 'RR Interval', key: 'rrInterval', unit: 'sec' },
    { label: 'QRS Duration', key: 'qrsDuration', unit: 'sec' },
    { label: 'QT Interval', key: 'qtInterval', unit: 'sec' },
    { label: 'HRV SDNN', key: 'hrvSdnn', unit: 'ms' },
    { label: 'HRV RMSSD', key: 'hrvRmssd', unit: 'ms' },
    { label: 'Classification', key: 'classification', unit: '' },
    { label: 'Confidence', key: 'confidence', unit: '%' },
    { label: 'Risk Level', key: 'riskLevel', unit: '' },
  ];

  metrics.forEach((metric) => {
    pdf.setTextColor(148, 163, 184);
    pdf.text(metric.label, margin, yPos);
    
    sessions.forEach((session, idx) => {
      const x = margin + (idx + 1) * colWidth;
      let value = '';
      
      if (metric.key === 'classification') {
        value = session.classification.label;
      } else if (metric.key === 'confidence') {
        value = session.classification.confidence.toFixed(1) + metric.unit;
      } else if (metric.key === 'riskLevel') {
        value = session.riskLevel.toUpperCase();
        const color = session.riskLevel === 'low' ? [34, 197, 94] :
                      session.riskLevel === 'moderate' ? [234, 179, 8] : [239, 68, 68];
        pdf.setTextColor(color[0], color[1], color[2]);
      } else {
        const metricValue = (session.metrics as any)[metric.key];
        value = typeof metricValue === 'number' 
          ? (metricValue < 10 ? metricValue.toFixed(3) : metricValue.toFixed(1)) + ' ' + metric.unit
          : String(metricValue);
      }
      
      if (metric.key !== 'riskLevel') {
        pdf.setTextColor(255, 255, 255);
      }
      pdf.text(value, x, yPos);
    });
    
    yPos += 8;
  });

  // Trend indicators
  yPos += 10;
  pdf.setDrawColor(20, 184, 166);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  pdf.setTextColor(20, 184, 166);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Trend Analysis', margin, yPos);
  yPos += 10;

  // Calculate trends
  if (sessions.length > 1) {
    const current = comparison.currentSession;
    const previous = comparison.previousSessions[0];
    
    const trends = [
      {
        label: 'Heart Rate',
        change: current.metrics.heartRateAvg - previous.metrics.heartRateAvg,
        unit: 'BPM',
      },
      {
        label: 'HRV SDNN',
        change: current.metrics.hrvSdnn - previous.metrics.hrvSdnn,
        unit: 'ms',
      },
      {
        label: 'Confidence',
        change: current.classification.confidence - previous.classification.confidence,
        unit: '%',
      },
    ];

    pdf.setFontSize(10);
    trends.forEach((trend) => {
      pdf.setTextColor(148, 163, 184);
      pdf.text(`${trend.label}: `, margin, yPos);
      
      const changeStr = trend.change >= 0 ? `+${trend.change.toFixed(1)}` : trend.change.toFixed(1);
      pdf.setTextColor(trend.change >= 0 ? 34 : 239, trend.change >= 0 ? 197 : 68, trend.change >= 0 ? 94 : 68);
      pdf.text(`${changeStr} ${trend.unit}`, margin + 30, yPos);
      yPos += 6;
    });
  }

  // Disclaimer
  yPos = pageHeight - 15;
  pdf.setTextColor(234, 179, 8);
  pdf.setFontSize(8);
  pdf.text(
    'DISCLAIMER: This report is for educational and decision-support purposes only. Consult a healthcare provider for medical advice.',
    margin, yPos
  );

  const fileName = `ECG_Comparison_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};

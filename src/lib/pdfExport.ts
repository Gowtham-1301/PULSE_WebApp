import jsPDF from 'jspdf';
import { RiskFusionResult } from '@/hooks/useRiskFusion';

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
  riskFusion?: RiskFusionResult | null;
  ecgData?: { time: number; value: number }[];
  peakTimes?: number[];
}

export interface ComparisonReport {
  currentSession: SessionReport;
  previousSessions: SessionReport[];
}

const COLORS = {
  primary: [20, 184, 166] as [number, number, number],
  accent: [236, 72, 153] as [number, number, number],
  background: [10, 15, 26] as [number, number, number],
  card: [26, 31, 46] as [number, number, number],
  text: [255, 255, 255] as [number, number, number],
  muted: [148, 163, 184] as [number, number, number],
  riskLow: [34, 197, 94] as [number, number, number],
  riskModerate: [234, 179, 8] as [number, number, number],
  riskHigh: [239, 68, 68] as [number, number, number],
  yellow: [234, 179, 8] as [number, number, number],
};

const setColor = (pdf: jsPDF, color: [number, number, number], type: 'text' | 'fill' | 'draw' = 'text') => {
  if (type === 'text') pdf.setTextColor(color[0], color[1], color[2]);
  else if (type === 'fill') pdf.setFillColor(color[0], color[1], color[2]);
  else pdf.setDrawColor(color[0], color[1], color[2]);
};

const getRiskColor = (level: string): [number, number, number] => {
  if (level === 'low') return COLORS.riskLow;
  if (level === 'moderate') return COLORS.riskModerate;
  return COLORS.riskHigh;
};

/**
 * Renders an ECG waveform onto a canvas and returns a data URL.
 * Highlights up to 3 R-peaks with annotated markers.
 */
const renderECGWaveform = (
  ecgData: { time: number; value: number }[],
  peakTimes: number[],
  width = 900,
  height = 200,
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0a0f1a';
  ctx.fillRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = '#1a2a2a';
  ctx.lineWidth = 0.5;
  const gridCols = 12;
  const gridRows = 6;
  for (let i = 0; i <= gridCols; i++) {
    const x = (i / gridCols) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let j = 0; j <= gridRows; j++) {
    const y = (j / gridRows) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Baseline
  ctx.strokeStyle = '#1e3a3a';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  const baseline = height * 0.65;
  ctx.beginPath();
  ctx.moveTo(0, baseline);
  ctx.lineTo(width, baseline);
  ctx.stroke();
  ctx.setLineDash([]);

  if (ecgData.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No ECG data recorded', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }

  // Normalize signal to canvas coords
  const minVal = Math.min(...ecgData.map(d => d.value));
  const maxVal = Math.max(...ecgData.map(d => d.value));
  const valRange = maxVal - minVal || 1;
  const minTime = ecgData[0].time;
  const maxTime = ecgData[ecgData.length - 1].time;
  const timeRange = maxTime - minTime || 1;

  const toX = (t: number) => ((t - minTime) / timeRange) * width;
  const toY = (v: number) => baseline - ((v - minVal) / valRange) * (height * 0.7);

  // Glow effect
  ctx.shadowColor = '#14b8a6';
  ctx.shadowBlur = 6;

  // Draw ECG line
  ctx.beginPath();
  ctx.strokeStyle = '#14b8a6';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ecgData.forEach((pt, i) => {
    const x = toX(pt.time);
    const y = toY(pt.value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Draw R-peak markers (up to 3 nicely spaced visible ones)
  const visiblePeakTimes = peakTimes
    .filter(t => t >= minTime && t <= maxTime)
    .slice(0, 3);

  visiblePeakTimes.forEach((t, i) => {
    const pt = ecgData.reduce((closest, d) =>
      Math.abs(d.time - t) < Math.abs(closest.time - t) ? d : closest
    );
    const px = toX(pt.time);
    const py = toY(pt.value);

    // Outer ring glow
    const grad = ctx.createRadialGradient(px, py, 2, px, py, 14);
    grad.addColorStop(0, 'rgba(236,72,153,0.6)');
    grad.addColorStop(1, 'rgba(236,72,153,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fill();

    // Dot
    ctx.fillStyle = '#ec4899';
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Vertical guide line down to x-axis label
    ctx.strokeStyle = 'rgba(236,72,153,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px, py + 6);
    ctx.lineTo(px, height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // "R" label above peak
    ctx.fillStyle = '#f9a8d4';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('R', px, py - 10);

    // Peak index label at bottom
    ctx.fillStyle = '#ec4899';
    ctx.font = '10px monospace';
    ctx.fillText(`P${i + 1}`, px, height - 5);
  });

  // Axis labels
  ctx.fillStyle = '#475569';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${minTime.toFixed(1)}s`, 4, height - 5);
  ctx.textAlign = 'right';
  ctx.fillText(`${maxTime.toFixed(1)}s`, width - 4, height - 5);
  ctx.textAlign = 'left';
  ctx.fillText(`${maxVal.toFixed(2)}mV`, 4, 14);
  ctx.fillText('0.00mV', 4, baseline + 12);

  return canvas.toDataURL('image/png');
};

// ─── Section helpers ───────────────────────────────────────────────────────────

const drawSectionHeader = (pdf: jsPDF, title: string, x: number, y: number) => {
  setColor(pdf, COLORS.primary, 'text');
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, x, y);
};

const drawDivider = (pdf: jsPDF, x: number, y: number, width: number) => {
  setColor(pdf, COLORS.primary, 'draw');
  pdf.setLineWidth(0.4);
  pdf.line(x, y, x + width, y);
};

const checkPageBreak = (pdf: jsPDF, yPos: number, needed: number, margin: number): number => {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (yPos + needed > pageHeight - 30) {
    pdf.addPage();
    setColor(pdf, COLORS.background, 'fill');
    pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pageHeight, 'F');
    return margin;
  }
  return yPos;
};

// ─── Main export ──────────────────────────────────────────────────────────────

export const generateSessionPDF = async (report: SessionReport): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── PAGE BACKGROUND ──
  setColor(pdf, COLORS.background, 'fill');
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // ── HEADER BANNER ──
  setColor(pdf, COLORS.card, 'fill');
  pdf.rect(0, 0, pageWidth, 38, 'F');
  setColor(pdf, COLORS.primary, 'draw');
  pdf.setLineWidth(1);
  pdf.line(0, 38, pageWidth, 38);

  setColor(pdf, COLORS.primary, 'text');
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PULSE', margin, y + 10);

  setColor(pdf, COLORS.muted, 'text');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Cardiac Analysis Report', margin + 28, y + 10);

  setColor(pdf, COLORS.text, 'text');
  pdf.setFontSize(7);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, y + 10, { align: 'right' });

  y += 18;
  setColor(pdf, COLORS.text, 'text');
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.sessionName || 'ECG Session Report', margin, y + 10);

  setColor(pdf, COLORS.muted, 'text');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const dateStr = `${report.startTime.toLocaleDateString()} at ${report.startTime.toLocaleTimeString()}  |  Duration: ${report.duration}`;
  pdf.text(dateStr, margin, y + 18);

  y = 52;

  // ── ECG WAVEFORM SECTION ──
  drawDivider(pdf, margin, y, contentWidth);
  y += 6;
  drawSectionHeader(pdf, '⬥ ECG WAVEFORM', margin, y);
  y += 6;

  const ecgData = report.ecgData || [];
  const peakTimes = report.peakTimes || [];
  const waveImgData = renderECGWaveform(ecgData, peakTimes, 900, 200);
  const waveHeight = 45;
  pdf.addImage(waveImgData, 'PNG', margin, y, contentWidth, waveHeight);
  y += waveHeight + 4;

  // Legend for peaks
  if (peakTimes.length > 0) {
    setColor(pdf, [236, 72, 153], 'fill');
    pdf.circle(margin + 2, y + 1.5, 1.5, 'F');
    setColor(pdf, COLORS.muted, 'text');
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text('R-peak detected (P1–P3 annotated)', margin + 6, y + 2.5);
  }
  y += 10;

  // ── AI CLASSIFICATION ──
  y = checkPageBreak(pdf, y, 35, margin);
  drawDivider(pdf, margin, y, contentWidth);
  y += 6;
  drawSectionHeader(pdf, '⬥ AI CLASSIFICATION', margin, y);
  y += 8;

  const classColW = contentWidth / 2;

  setColor(pdf, COLORS.text, 'text');
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.classification.label, margin, y);

  const confColor = report.classification.confidence > 90 ? COLORS.riskLow :
    report.classification.confidence > 75 ? COLORS.riskModerate : COLORS.riskHigh;
  setColor(pdf, confColor, 'text');
  pdf.setFontSize(22);
  pdf.text(`${report.classification.confidence.toFixed(1)}%`, margin + classColW, y, { align: 'right' });

  y += 5;
  setColor(pdf, COLORS.muted, 'text');
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'normal');
  const detailLines = pdf.splitTextToSize(report.classification.details, contentWidth);
  pdf.text(detailLines, margin, y);
  y += detailLines.length * 4.5 + 8;

  // ── VITAL METRICS ──
  y = checkPageBreak(pdf, y, 50, margin);
  drawDivider(pdf, margin, y, contentWidth);
  y += 6;
  drawSectionHeader(pdf, '⬥ VITAL METRICS', margin, y);
  y += 8;

  const metricsData: [string, string][] = [
    ['Heart Rate (avg)', `${report.metrics.heartRateAvg} BPM`],
    ['Heart Rate (min)', `${report.metrics.heartRateMin} BPM`],
    ['Heart Rate (max)', `${report.metrics.heartRateMax} BPM`],
    ['RR Interval', `${report.metrics.rrInterval.toFixed(3)} s`],
    ['QRS Duration', `${report.metrics.qrsDuration.toFixed(3)} s`],
    ['QT Interval', `${report.metrics.qtInterval.toFixed(3)} s`],
    ['HRV SDNN', `${report.metrics.hrvSdnn.toFixed(1)} ms`],
    ['HRV RMSSD', `${report.metrics.hrvRmssd.toFixed(1)} ms`],
  ];

  const colW = contentWidth / 2;
  const rowH = 8;
  metricsData.forEach((row, idx) => {
    const col = idx % 2;
    const rowIdx = Math.floor(idx / 2);
    const x = margin + col * colW;
    const cy = y + rowIdx * rowH;

    // Subtle row bg
    if (rowIdx % 2 === 0) {
      setColor(pdf, [26, 31, 46], 'fill');
      pdf.rect(x, cy - 4, colW - 2, rowH, 'F');
    }

    setColor(pdf, COLORS.muted, 'text');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(row[0], x + 2, cy + 0.5);

    setColor(pdf, COLORS.text, 'text');
    pdf.setFont('helvetica', 'bold');
    pdf.text(row[1], x + colW - 4, cy + 0.5, { align: 'right' });
  });
  y += Math.ceil(metricsData.length / 2) * rowH + 8;

  // ── RISK ASSESSMENT ──
  y = checkPageBreak(pdf, y, 30, margin);
  drawDivider(pdf, margin, y, contentWidth);
  y += 6;
  drawSectionHeader(pdf, '⬥ RISK ASSESSMENT', margin, y);
  y += 8;

  const riskColor = getRiskColor(report.riskLevel);
  const riskBg: [number, number, number] = [
    Math.round(riskColor[0] * 0.15),
    Math.round(riskColor[1] * 0.15),
    Math.round(riskColor[2] * 0.15),
  ];
  setColor(pdf, riskBg, 'fill');
  pdf.roundedRect(margin, y - 4, contentWidth, 16, 2, 2, 'F');
  setColor(pdf, riskColor, 'draw');
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y - 4, contentWidth, 16, 2, 2, 'S');

  setColor(pdf, riskColor, 'text');
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`ECG RISK: ${report.riskLevel.toUpperCase()}`, margin + 5, y + 5);

  y += 18;

  // ── CLINICAL RISK FUSION ──
  if (report.riskFusion) {
    const rf = report.riskFusion;
    y = checkPageBreak(pdf, y, 80, margin);
    drawDivider(pdf, margin, y, contentWidth);
    y += 6;
    drawSectionHeader(pdf, '⬥ CLINICAL RISK FUSION ANALYSIS', margin, y);
    y += 4;
    setColor(pdf, COLORS.muted, 'text');
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text('AI-powered synthesis of ECG signal + clinical profile data', margin, y);
    y += 8;

    // Fused score banner
    const fusedColor = getRiskColor(rf.finalRiskLevel);
    const fusedBg: [number, number, number] = [
      Math.round(fusedColor[0] * 0.12),
      Math.round(fusedColor[1] * 0.12),
      Math.round(fusedColor[2] * 0.12),
    ];
    setColor(pdf, fusedBg, 'fill');
    pdf.rect(margin, y, contentWidth, 22, 'F');
    setColor(pdf, fusedColor, 'draw');
    pdf.setLineWidth(0.6);
    pdf.rect(margin, y, contentWidth, 22, 'S');

    setColor(pdf, fusedColor, 'text');
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`FUSED RISK: ${rf.finalRiskLevel.toUpperCase()}`, margin + 5, y + 9);

    setColor(pdf, COLORS.text, 'text');
    pdf.setFontSize(24);
    pdf.text(`${rf.fusedRiskScore}/100`, pageWidth - margin - 5, y + 11, { align: 'right' });

    setColor(pdf, COLORS.muted, 'text');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Confidence: ${rf.confidence}%`, margin + 5, y + 17);

    y += 28;

    // Score breakdown bars
    const barLabels = [
      { label: 'ECG Signal Risk', score: rf.ecgRiskScore, color: COLORS.primary },
      { label: 'Clinical Profile Risk', score: rf.clinicalRiskScore, color: COLORS.accent },
      { label: 'Fused Risk Score', score: rf.fusedRiskScore, color: getRiskColor(rf.finalRiskLevel) },
    ];

    const barW = (contentWidth - 8) / barLabels.length;
    barLabels.forEach((item, i) => {
      const bx = margin + i * (barW + 4);

      setColor(pdf, COLORS.card, 'fill');
      pdf.rect(bx, y, barW, 20, 'F');

      setColor(pdf, item.color, 'text');
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.label, bx + 2, y + 5);

      setColor(pdf, [30, 40, 55], 'fill');
      pdf.rect(bx + 2, y + 7, barW - 4, 5, 'F');

      const barFill = Math.max(0, Math.min(100, item.score));
      setColor(pdf, item.color, 'fill');
      pdf.rect(bx + 2, y + 7, (barW - 4) * barFill / 100, 5, 'F');

      setColor(pdf, item.color, 'text');
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${item.score}`, bx + barW / 2, y + 18, { align: 'center' });
    });
    y += 28;

    // Risk Factors
    if (rf.riskFactors.length > 0) {
      y = checkPageBreak(pdf, y, 20, margin);
      setColor(pdf, COLORS.riskHigh, 'text');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('▲ RISK FACTORS', margin, y);
      y += 5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const factorCols = 2;
      const factorW = contentWidth / factorCols;
      rf.riskFactors.forEach((f, i) => {
        const col = i % factorCols;
        const row = Math.floor(i / factorCols);
        y = checkPageBreak(pdf, y + (col === 0 && row > 0 ? 0 : 0), 6, margin);
        const fx = margin + col * factorW;
        const fy = (col === 0 ? y : y - (i % factorCols === 1 ? 5 : 0));
        setColor(pdf, COLORS.riskHigh, 'text');
        pdf.text('•', fx, fy + row * 5 + (col > 0 ? 0 : 0));
        setColor(pdf, COLORS.muted, 'text');
        pdf.text(f, fx + 4, fy + row * 5 + (col > 0 ? 0 : 0));
      });
      y += Math.ceil(rf.riskFactors.length / 2) * 5 + 4;
    }

    // Protective Factors
    if (rf.protectiveFactors.length > 0) {
      y = checkPageBreak(pdf, y, 20, margin);
      setColor(pdf, COLORS.riskLow, 'text');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('✓ PROTECTIVE FACTORS', margin, y);
      y += 5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      rf.protectiveFactors.forEach((f) => {
        y = checkPageBreak(pdf, y, 5, margin);
        setColor(pdf, COLORS.riskLow, 'text');
        pdf.text('•', margin, y);
        setColor(pdf, COLORS.muted, 'text');
        pdf.text(f, margin + 4, y);
        y += 5;
      });
      y += 2;
    }

    // Recommendations from fusion
    if (rf.recommendations.length > 0) {
      y = checkPageBreak(pdf, y, 20, margin);
      setColor(pdf, COLORS.primary, 'text');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('◈ CLINICAL RECOMMENDATIONS', margin, y);
      y += 5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      rf.recommendations.forEach((rec) => {
        y = checkPageBreak(pdf, y, 5, margin);
        const lines = pdf.splitTextToSize(`• ${rec}`, contentWidth - 4);
        setColor(pdf, COLORS.muted, 'text');
        pdf.text(lines, margin, y);
        y += lines.length * 4.5;
      });
      y += 2;
    }
  }

  // ── GENERAL SUGGESTIONS ──
  if (report.suggestions.length > 0) {
    y = checkPageBreak(pdf, y, 20, margin);
    drawDivider(pdf, margin, y, contentWidth);
    y += 6;
    drawSectionHeader(pdf, '⬥ RECOMMENDATIONS', margin, y);
    y += 8;

    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    report.suggestions.forEach((s) => {
      y = checkPageBreak(pdf, y, 7, margin);
      const lines = pdf.splitTextToSize(`• ${s}`, contentWidth - 4);
      setColor(pdf, COLORS.muted, 'text');
      pdf.text(lines, margin, y);
      y += lines.length * 4.5;
    });
  }

  // ── DISCLAIMER (pinned to bottom of last page) ──
  const disclaimerY = pdf.internal.pageSize.getHeight() - 22;
  setColor(pdf, COLORS.yellow, 'draw');
  pdf.setLineWidth(0.3);
  pdf.line(margin, disclaimerY, pageWidth - margin, disclaimerY);

  setColor(pdf, COLORS.yellow, 'text');
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MEDICAL DISCLAIMER', margin, disclaimerY + 5);

  setColor(pdf, COLORS.muted, 'text');
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    'This report is for educational and decision-support purposes only. It is NOT intended to diagnose, treat, or replace',
    margin, disclaimerY + 10,
  );
  pdf.text(
    'professional medical advice. Always consult a qualified healthcare provider for any medical concerns.',
    margin, disclaimerY + 14,
  );

  // ── SAVE ──
  const fileName = `PULSE_Report_${report.startTime.toISOString().split('T')[0]}_${report.sessionId.slice(0, 8)}.pdf`;
  pdf.save(fileName);
};

// ─── Comparison PDF ─────────────────────────────────────────────────────────

export const generateComparisonPDF = async (comparison: ComparisonReport): Promise<void> => {
  const pdf = new jsPDF('l', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  setColor(pdf, COLORS.background, 'fill');
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header
  setColor(pdf, COLORS.primary, 'text');
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PULSE — ECG Session Comparison', margin, y + 10);

  setColor(pdf, COLORS.muted, 'text');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, y + 10, { align: 'right' });
  y += 22;

  const sessions = [comparison.currentSession, ...comparison.previousSessions.slice(0, 3)];
  const sessionColW = (contentWidth - 40) / sessions.length;

  // Table header
  setColor(pdf, COLORS.muted, 'text');
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Metric', margin, y);
  sessions.forEach((s, i) => {
    const x = margin + 40 + i * sessionColW;
    if (i === 0) setColor(pdf, COLORS.primary, 'text');
    else setColor(pdf, COLORS.muted, 'text');
    pdf.text(i === 0 ? `Current\n${s.startTime.toLocaleDateString()}` : s.startTime.toLocaleDateString(), x, y);
  });
  y += 10;

  drawDivider(pdf, margin, y, contentWidth);
  y += 6;

  // Metric rows
  const metricRows: { label: string; getValue: (s: SessionReport) => string }[] = [
    { label: 'Heart Rate (avg)', getValue: s => `${s.metrics.heartRateAvg} BPM` },
    { label: 'RR Interval', getValue: s => `${s.metrics.rrInterval.toFixed(3)} s` },
    { label: 'QRS Duration', getValue: s => `${s.metrics.qrsDuration.toFixed(3)} s` },
    { label: 'QT Interval', getValue: s => `${s.metrics.qtInterval.toFixed(3)} s` },
    { label: 'HRV SDNN', getValue: s => `${s.metrics.hrvSdnn.toFixed(1)} ms` },
    { label: 'HRV RMSSD', getValue: s => `${s.metrics.hrvRmssd.toFixed(1)} ms` },
    { label: 'Classification', getValue: s => s.classification.label },
    { label: 'Confidence', getValue: s => `${s.classification.confidence.toFixed(1)}%` },
    { label: 'Risk Level', getValue: s => s.riskLevel.toUpperCase() },
  ];

  metricRows.forEach((row, ri) => {
    if (ri % 2 === 0) {
      setColor(pdf, COLORS.card, 'fill');
      pdf.rect(margin, y - 3.5, contentWidth, 8, 'F');
    }

    setColor(pdf, COLORS.muted, 'text');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(row.label, margin + 1, y + 0.5);

    sessions.forEach((s, i) => {
      const x = margin + 40 + i * sessionColW;
      if (row.label === 'Risk Level') {
        setColor(pdf, getRiskColor(s.riskLevel), 'text');
      } else {
        setColor(pdf, i === 0 ? COLORS.text : COLORS.muted, 'text');
      }
      pdf.setFont('helvetica', i === 0 ? 'bold' : 'normal');
      pdf.text(row.getValue(s), x, y + 0.5);
    });
    y += 8;
  });

  y += 6;
  drawDivider(pdf, margin, y, contentWidth);
  y += 8;

  // Trend analysis
  if (sessions.length > 1) {
    setColor(pdf, COLORS.primary, 'text');
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Trend Analysis (vs. previous)', margin, y);
    y += 8;

    const current = comparison.currentSession;
    const prev = comparison.previousSessions[0];
    const trends = [
      { label: 'Heart Rate', delta: current.metrics.heartRateAvg - prev.metrics.heartRateAvg, unit: 'BPM' },
      { label: 'HRV SDNN', delta: current.metrics.hrvSdnn - prev.metrics.hrvSdnn, unit: 'ms' },
      { label: 'Confidence', delta: current.classification.confidence - prev.classification.confidence, unit: '%' },
    ];

    pdf.setFontSize(9);
    trends.forEach((t) => {
      setColor(pdf, COLORS.muted, 'text');
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${t.label}:`, margin, y);

      const col: [number, number, number] = t.delta >= 0 ? COLORS.riskLow : COLORS.riskHigh;
      setColor(pdf, col, 'text');
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${t.delta >= 0 ? '+' : ''}${t.delta.toFixed(1)} ${t.unit}`, margin + 35, y);
      y += 6;
    });
  }

  // Disclaimer
  const dY = pageHeight - 12;
  setColor(pdf, COLORS.yellow, 'text');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    'DISCLAIMER: For educational and decision-support purposes only. Not intended to diagnose or treat. Consult a healthcare provider for medical advice.',
    margin, dY,
  );

  pdf.save(`PULSE_Comparison_${new Date().toISOString().split('T')[0]}.pdf`);
};

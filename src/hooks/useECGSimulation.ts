import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimePeakDetector, Peak } from '@/lib/peakDetection';

interface ECGDataPoint {
  time: number;
  value: number;
}

interface ECGMetrics {
  heartRate: number;
  rrInterval: number;
  qrsDuration: number;
  qtInterval: number;
  hrvSdnn: number;
  hrvRmssd: number;
}

interface ECGClassification {
  label: string;
  confidence: number;
  details: string;
}

// Simulated ECG waveform generator
const generateECGPoint = (t: number, baseRate: number = 72): number => {
  const beatInterval = 60 / baseRate;
  const phase = (t % beatInterval) / beatInterval;
  
  // P wave (atrial depolarization)
  const pWave = 0.15 * Math.exp(-Math.pow((phase - 0.1) / 0.02, 2));
  
  // QRS complex (ventricular depolarization)
  const qWave = -0.1 * Math.exp(-Math.pow((phase - 0.2) / 0.008, 2));
  const rWave = 1.2 * Math.exp(-Math.pow((phase - 0.22) / 0.012, 2));
  const sWave = -0.2 * Math.exp(-Math.pow((phase - 0.24) / 0.008, 2));
  
  // T wave (ventricular repolarization)
  const tWave = 0.25 * Math.exp(-Math.pow((phase - 0.35) / 0.04, 2));
  
  // Add slight noise for realism
  const noise = (Math.random() - 0.5) * 0.02;
  
  return pWave + qWave + rWave + sWave + tWave + noise;
};

// Calculate HRV metrics from RR intervals
const calculateHRV = (rrIntervals: number[]): { sdnn: number; rmssd: number } => {
  if (rrIntervals.length < 2) {
    return { sdnn: 45, rmssd: 35 };
  }
  
  // SDNN: Standard deviation of NN intervals
  const mean = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
  const squaredDiffs = rrIntervals.map(rr => Math.pow(rr - mean, 2));
  const sdnn = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / rrIntervals.length) * 1000; // Convert to ms
  
  // RMSSD: Root mean square of successive differences
  const successiveDiffs: number[] = [];
  for (let i = 1; i < rrIntervals.length; i++) {
    successiveDiffs.push(Math.pow(rrIntervals[i] - rrIntervals[i - 1], 2));
  }
  const rmssd = successiveDiffs.length > 0 
    ? Math.sqrt(successiveDiffs.reduce((a, b) => a + b, 0) / successiveDiffs.length) * 1000 
    : 35;
  
  return { sdnn, rmssd };
};

export const useECGSimulation = (isRecording: boolean = false) => {
  const [data, setData] = useState<ECGDataPoint[]>([]);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [metrics, setMetrics] = useState<ECGMetrics>({
    heartRate: 72,
    rrInterval: 0.833,
    qrsDuration: 0.08,
    qtInterval: 0.36,
    hrvSdnn: 45,
    hrvRmssd: 35,
  });
  const [classification, setClassification] = useState<ECGClassification>({
    label: 'Normal Sinus Rhythm',
    confidence: 94.5,
    details: 'Regular rhythm with consistent P-QRS-T morphology',
  });
  const [riskLevel, setRiskLevel] = useState<'low' | 'moderate' | 'high'>('low');
  
  const timeRef = useRef(0);
  const heartRateRef = useRef(72);
  const animationRef = useRef<number>();
  const peakDetectorRef = useRef<RealtimePeakDetector>(new RealtimePeakDetector(250, 5));
  
  // Generate real-time ECG data with peak detection
  useEffect(() => {
    if (!isRecording) return;
    
    const generateData = () => {
      const newPoints: ECGDataPoint[] = [];
      const samplingRate = 250; // 250 Hz
      const duration = 0.016; // ~60fps frame time
      const samples = Math.floor(samplingRate * duration);
      
      // Simulate small heart rate fluctuations
      const variation = (Math.random() - 0.5) * 0.5;
      heartRateRef.current = Math.max(55, Math.min(110, heartRateRef.current + variation));
      
      for (let i = 0; i < samples; i++) {
        timeRef.current += 1 / samplingRate;
        newPoints.push({
          time: timeRef.current,
          value: generateECGPoint(timeRef.current, heartRateRef.current),
        });
      }
      
      // Real-time peak detection
      const peakResult = peakDetectorRef.current.addData(newPoints);
      setPeaks(peakResult.peaks);
      
      // Update metrics from peak detection
      if (peakResult.avgHR > 0) {
        const hrv = calculateHRV(peakResult.rrIntervals);
        const hr = peakResult.avgHR;
        const rrInterval = peakResult.rrIntervals[peakResult.rrIntervals.length - 1] || 60 / hr;
        
        setMetrics({
          heartRate: Math.round(hr),
          rrInterval: parseFloat(rrInterval.toFixed(3)),
          qrsDuration: 0.08 + (Math.random() - 0.5) * 0.01,
          qtInterval: 0.36 + (Math.random() - 0.5) * 0.02,
          hrvSdnn: hrv.sdnn,
          hrvRmssd: hrv.rmssd,
        });
        
        // Update classification based on heart rate
        if (hr < 60) {
          setClassification({
            label: 'Sinus Bradycardia',
            confidence: 89 + Math.random() * 5,
            details: 'Slower than normal heart rate, regular rhythm',
          });
          setRiskLevel('moderate');
        } else if (hr > 100) {
          setClassification({
            label: 'Sinus Tachycardia',
            confidence: 87 + Math.random() * 6,
            details: 'Faster than normal heart rate, regular rhythm',
          });
          setRiskLevel('moderate');
        } else {
          setClassification({
            label: 'Normal Sinus Rhythm',
            confidence: 92 + Math.random() * 6,
            details: 'Regular rhythm with consistent P-QRS-T morphology',
          });
          setRiskLevel('low');
        }
      }
      
      setData(prev => {
        const combined = [...prev, ...newPoints];
        // Keep last 5 seconds of data (1250 points at 250Hz)
        return combined.slice(-1250);
      });
      
      animationRef.current = requestAnimationFrame(generateData);
    };
    
    animationRef.current = requestAnimationFrame(generateData);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording]);
  
  const resetData = useCallback(() => {
    timeRef.current = 0;
    heartRateRef.current = 72;
    setData([]);
    setPeaks([]);
    peakDetectorRef.current.reset();
  }, []);
  
  return {
    data,
    peaks,
    metrics,
    classification,
    riskLevel,
    resetData,
  };
};


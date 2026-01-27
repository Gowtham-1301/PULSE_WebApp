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

// Simulated ECG waveform generator with cleaner signal
const generateECGPoint = (t: number, baseRate: number = 72): number => {
  const beatInterval = 60 / baseRate;
  const phase = (t % beatInterval) / beatInterval;
  
  // Baseline (isoelectric line)
  let value = 0;
  
  // P wave (atrial depolarization) - small, rounded bump
  value += 0.12 * Math.exp(-Math.pow((phase - 0.10) / 0.025, 2));
  
  // PR segment (flat)
  
  // Q wave (small negative deflection)
  value += -0.08 * Math.exp(-Math.pow((phase - 0.19) / 0.008, 2));
  
  // R wave (tall, sharp positive peak) - THE MAIN PEAK
  value += 1.0 * Math.exp(-Math.pow((phase - 0.21) / 0.010, 2));
  
  // S wave (negative deflection after R)
  value += -0.15 * Math.exp(-Math.pow((phase - 0.23) / 0.008, 2));
  
  // ST segment (slightly elevated or flat)
  value += 0.02 * Math.exp(-Math.pow((phase - 0.28) / 0.03, 2));
  
  // T wave (repolarization - broader, lower amplitude)
  value += 0.20 * Math.exp(-Math.pow((phase - 0.38) / 0.045, 2));
  
  // Very minimal noise (realistic but not overwhelming)
  const noise = (Math.random() - 0.5) * 0.008;
  
  return value + noise;
};

// Calculate HRV metrics from RR intervals
const calculateHRV = (rrIntervals: number[]): { sdnn: number; rmssd: number } => {
  if (rrIntervals.length < 2) {
    // Return -1 to indicate insufficient data, handled in UI
    return { sdnn: -1, rmssd: -1 };
  }
  
  // SDNN: Standard deviation of NN intervals (in seconds, convert to ms)
  const mean = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
  const squaredDiffs = rrIntervals.map(rr => Math.pow(rr - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / rrIntervals.length;
  const sdnn = Math.sqrt(variance) * 1000; // Convert seconds to ms
  
  // RMSSD: Root mean square of successive differences
  const successiveDiffs: number[] = [];
  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    successiveDiffs.push(diff * diff);
  }
  
  const rmssd = successiveDiffs.length > 0 
    ? Math.sqrt(successiveDiffs.reduce((a, b) => a + b, 0) / successiveDiffs.length) * 1000 
    : -1;
  
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
        
        // Only update HRV if we have valid values (>= 0), otherwise keep previous or use defaults
        setMetrics(prev => ({
          heartRate: Math.round(hr),
          rrInterval: parseFloat(rrInterval.toFixed(3)),
          qrsDuration: 0.08 + (Math.random() - 0.5) * 0.01,
          qtInterval: 0.36 + (Math.random() - 0.5) * 0.02,
          hrvSdnn: hrv.sdnn >= 0 ? parseFloat(hrv.sdnn.toFixed(1)) : prev.hrvSdnn,
          hrvRmssd: hrv.rmssd >= 0 ? parseFloat(hrv.rmssd.toFixed(1)) : prev.hrvRmssd,
        }));
        
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


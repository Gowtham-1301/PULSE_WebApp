import { useState, useEffect, useCallback, useRef } from 'react';

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

export const useECGSimulation = (isRecording: boolean = false) => {
  const [data, setData] = useState<ECGDataPoint[]>([]);
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
  
  // Simulate natural heart rate variations
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate small heart rate fluctuations
      const variation = (Math.random() - 0.5) * 4;
      heartRateRef.current = Math.max(60, Math.min(100, heartRateRef.current + variation));
      
      const hr = heartRateRef.current;
      const rrInterval = 60 / hr;
      
      setMetrics({
        heartRate: Math.round(hr),
        rrInterval: parseFloat(rrInterval.toFixed(3)),
        qrsDuration: 0.08 + (Math.random() - 0.5) * 0.01,
        qtInterval: 0.36 + (Math.random() - 0.5) * 0.02,
        hrvSdnn: 40 + Math.random() * 20,
        hrvRmssd: 30 + Math.random() * 15,
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
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Generate real-time ECG data
  useEffect(() => {
    if (!isRecording) return;
    
    const generateData = () => {
      const newPoints: ECGDataPoint[] = [];
      const samplingRate = 250; // 250 Hz
      const duration = 0.016; // ~60fps frame time
      const samples = Math.floor(samplingRate * duration);
      
      for (let i = 0; i < samples; i++) {
        timeRef.current += 1 / samplingRate;
        newPoints.push({
          time: timeRef.current,
          value: generateECGPoint(timeRef.current, heartRateRef.current),
        });
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
    setData([]);
  }, []);
  
  return {
    data,
    metrics,
    classification,
    riskLevel,
    resetData,
  };
};

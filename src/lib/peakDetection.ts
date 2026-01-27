/**
 * Real-time R-peak detection using simplified Pan-Tompkins algorithm
 * Optimized for streaming ECG data analysis
 */

export interface Peak {
  time: number;
  value: number;
  index: number;
}

export interface PeakDetectionResult {
  peaks: Peak[];
  rrIntervals: number[];
  instantHR: number;
  avgHR: number;
}

// Band-pass filter coefficients (5-15 Hz for QRS detection)
const bandpassFilter = (data: number[], sampleRate: number = 250): number[] => {
  const filtered: number[] = [];
  const lowCut = 5 / (sampleRate / 2);
  const highCut = 15 / (sampleRate / 2);
  
  // Simple moving average high-pass then low-pass
  const windowSize = Math.floor(sampleRate / 15);
  
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowSize); j <= Math.min(data.length - 1, i + windowSize); j++) {
      sum += data[j];
      count++;
    }
    // High-pass: subtract moving average
    filtered.push(data[i] - sum / count);
  }
  
  return filtered;
};

// Derivative filter to emphasize QRS slope
const derivative = (data: number[]): number[] => {
  const result: number[] = [];
  for (let i = 2; i < data.length - 2; i++) {
    result.push((-data[i - 2] - 2 * data[i - 1] + 2 * data[i + 1] + data[i + 2]) / 8);
  }
  return result;
};

// Square the signal to make all values positive and emphasize large differences
const squaring = (data: number[]): number[] => {
  return data.map(x => x * x);
};

// Moving window integration
const movingWindowIntegration = (data: number[], windowSize: number = 30): number[] => {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    const start = Math.max(0, i - windowSize + 1);
    for (let j = start; j <= i; j++) {
      sum += data[j];
    }
    result.push(sum / (i - start + 1));
  }
  return result;
};

// Improved adaptive thresholding for peak detection with noise rejection
const findPeaks = (
  processedSignal: number[],
  originalSignal: number[],
  times: number[],
  sampleRate: number = 250
): Peak[] => {
  const peaks: Peak[] = [];
  const refractoryPeriod = Math.floor(0.25 * sampleRate); // 250ms refractory period (min 240 BPM)
  const minPeakDistance = Math.floor(0.3 * sampleRate); // Minimum 300ms between peaks
  
  if (processedSignal.length < 10) return peaks;
  
  // Calculate robust threshold using percentile instead of just max
  const sortedSignal = [...processedSignal].sort((a, b) => b - a);
  const percentile95 = sortedSignal[Math.floor(sortedSignal.length * 0.05)] || 0;
  const maxVal = sortedSignal[0] || 0;
  
  // More conservative threshold
  let threshold = Math.max(0.4 * maxVal, 0.5 * percentile95);
  const minThreshold = 0.1 * maxVal; // Never go below 10% of max
  
  let lastPeakIndex = -refractoryPeriod;
  
  for (let i = 2; i < processedSignal.length - 2; i++) {
    // Stronger local maximum check (compare with neighbors on both sides)
    const isLocalMax = 
      processedSignal[i] > processedSignal[i - 1] &&
      processedSignal[i] > processedSignal[i - 2] &&
      processedSignal[i] > processedSignal[i + 1] &&
      processedSignal[i] > processedSignal[i + 2];
    
    // Must be above threshold and respect refractory period
    if (isLocalMax && processedSignal[i] > threshold && i - lastPeakIndex >= refractoryPeriod) {
      // Find the actual R-peak in the original signal (within a small window)
      const searchStart = Math.max(0, i - 8);
      const searchEnd = Math.min(originalSignal.length - 1, i + 8);
      let maxIdx = i;
      let peakVal = originalSignal[i] || 0;
      
      for (let j = searchStart; j <= searchEnd; j++) {
        if (originalSignal[j] !== undefined && originalSignal[j] > peakVal) {
          peakVal = originalSignal[j];
          maxIdx = j;
        }
      }
      
      // Only add peak if original signal value is significant (above 0.5 mV for R-wave)
      if (peakVal > 0.4) {
        peaks.push({
          time: times[maxIdx] || 0,
          value: peakVal,
          index: maxIdx,
        });
        
        lastPeakIndex = i;
        
        // Update threshold adaptively (learning rate)
        threshold = Math.max(0.3 * processedSignal[i] + 0.7 * threshold, minThreshold);
      }
    }
  }
  
  return peaks;
};

// Calculate RR intervals and heart rate from detected peaks
const calculateMetrics = (peaks: Peak[]): { rrIntervals: number[]; instantHR: number; avgHR: number } => {
  const rrIntervals: number[] = [];
  
  for (let i = 1; i < peaks.length; i++) {
    const rr = peaks[i].time - peaks[i - 1].time;
    if (rr > 0.3 && rr < 2.0) { // Valid RR interval range (30-200 BPM)
      rrIntervals.push(rr);
    }
  }
  
  if (rrIntervals.length === 0) {
    return { rrIntervals: [], instantHR: 0, avgHR: 0 };
  }
  
  const instantHR = 60 / rrIntervals[rrIntervals.length - 1];
  const avgRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
  const avgHR = 60 / avgRR;
  
  return { rrIntervals, instantHR, avgHR };
};

/**
 * Main peak detection function - call this with ECG data
 * @param data Array of ECG data points with time and value
 * @param sampleRate Sampling rate in Hz (default 250)
 * @returns Detected peaks and calculated metrics
 */
export const detectPeaks = (
  data: { time: number; value: number }[],
  sampleRate: number = 250
): PeakDetectionResult => {
  if (data.length < 50) {
    return { peaks: [], rrIntervals: [], instantHR: 0, avgHR: 0 };
  }
  
  const values = data.map(d => d.value);
  const times = data.map(d => d.time);
  
  // Apply Pan-Tompkins preprocessing
  const filtered = bandpassFilter(values, sampleRate);
  const differentiated = derivative(filtered);
  const squared = squaring(differentiated);
  const integrated = movingWindowIntegration(squared, Math.floor(0.15 * sampleRate));
  
  // Detect peaks
  const peaks = findPeaks(integrated, values, times, sampleRate);
  
  // Calculate metrics
  const { rrIntervals, instantHR, avgHR } = calculateMetrics(peaks);
  
  return { peaks, rrIntervals, instantHR, avgHR };
};

/**
 * Real-time peak detection for streaming data
 * Maintains state between calls for continuous monitoring
 */
export class RealtimePeakDetector {
  private buffer: { time: number; value: number }[] = [];
  private detectedPeaks: Peak[] = [];
  private lastProcessedIndex = 0;
  private sampleRate: number;
  private bufferSize: number;
  
  constructor(sampleRate: number = 250, bufferSeconds: number = 5) {
    this.sampleRate = sampleRate;
    this.bufferSize = sampleRate * bufferSeconds;
  }
  
  addData(newData: { time: number; value: number }[]): PeakDetectionResult {
    // Add new data to buffer
    this.buffer.push(...newData);
    
    // Keep buffer size manageable
    if (this.buffer.length > this.bufferSize) {
      const removeCount = this.buffer.length - this.bufferSize;
      this.buffer.splice(0, removeCount);
      this.lastProcessedIndex = Math.max(0, this.lastProcessedIndex - removeCount);
      
      // Remove old peaks
      const minTime = this.buffer[0]?.time || 0;
      this.detectedPeaks = this.detectedPeaks.filter(p => p.time >= minTime);
    }
    
    // Only process if we have enough new data
    if (this.buffer.length - this.lastProcessedIndex < 50) {
      const { rrIntervals, instantHR, avgHR } = calculateMetrics(this.detectedPeaks);
      return { peaks: this.detectedPeaks, rrIntervals, instantHR, avgHR };
    }
    
    // Detect peaks in new data window
    const result = detectPeaks(this.buffer, this.sampleRate);
    
    // Merge new peaks (avoid duplicates)
    const lastPeakTime = this.detectedPeaks[this.detectedPeaks.length - 1]?.time || 0;
    const newPeaks = result.peaks.filter(p => p.time > lastPeakTime);
    this.detectedPeaks.push(...newPeaks);
    
    this.lastProcessedIndex = this.buffer.length;
    
    return {
      peaks: this.detectedPeaks,
      rrIntervals: result.rrIntervals,
      instantHR: result.instantHR,
      avgHR: result.avgHR,
    };
  }
  
  reset() {
    this.buffer = [];
    this.detectedPeaks = [];
    this.lastProcessedIndex = 0;
  }
  
  getPeaks(): Peak[] {
    return this.detectedPeaks;
  }
}

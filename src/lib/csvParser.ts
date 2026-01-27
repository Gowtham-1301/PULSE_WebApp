/**
 * CSV Parser for ECG data files
 * Supports various ECG data formats
 */

export interface ParsedECGData {
  samples: number[];
  timestamps: number[];
  sampleRate: number;
  duration: number;
  rawData: { time: number; value: number }[];
}

export interface CSVParseResult {
  success: boolean;
  data?: ParsedECGData;
  error?: string;
}

/**
 * Parse CSV file containing ECG data
 * Supports formats:
 * - Single column (just values, assumes 250Hz)
 * - Two columns (time, value)
 * - MIT-BIH style format
 */
export const parseECGCSV = async (file: File): Promise<CSVParseResult> => {
  try {
    const text = await file.text();
    const lines = text.trim().split('\n');
    
    if (lines.length < 10) {
      return { success: false, error: 'File too short. Need at least 10 data points.' };
    }
    
    // Detect if first line is header
    const firstLine = lines[0].trim();
    const hasHeader = isNaN(parseFloat(firstLine.split(/[,\t;]/)[0]));
    const dataLines = hasHeader ? lines.slice(1) : lines;
    
    // Detect delimiter
    const delimiter = detectDelimiter(firstLine);
    
    // Parse data
    const samples: number[] = [];
    const timestamps: number[] = [];
    
    // Detect format (single column vs two columns)
    const firstDataLine = dataLines[0].split(delimiter);
    const isTwoColumn = firstDataLine.length >= 2 && !isNaN(parseFloat(firstDataLine[1]));
    
    let inferredSampleRate = 250; // Default
    
    dataLines.forEach((line, index) => {
      const parts = line.trim().split(delimiter);
      if (parts.length === 0) return;
      
      if (isTwoColumn) {
        // Two column format: time, value
        const time = parseFloat(parts[0]);
        const value = parseFloat(parts[1]);
        if (!isNaN(time) && !isNaN(value)) {
          timestamps.push(time);
          samples.push(value);
        }
      } else {
        // Single column: just values
        const value = parseFloat(parts[0]);
        if (!isNaN(value)) {
          timestamps.push(index / inferredSampleRate);
          samples.push(value);
        }
      }
    });
    
    if (samples.length < 10) {
      return { success: false, error: 'Could not parse enough valid data points.' };
    }
    
    // Infer sample rate from timestamps if two-column
    if (isTwoColumn && timestamps.length >= 2) {
      const avgInterval = (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1);
      if (avgInterval > 0) {
        inferredSampleRate = Math.round(1 / avgInterval);
      }
    }
    
    // Normalize values if they seem to be in different units
    const normalizedSamples = normalizeECGValues(samples);
    
    const duration = timestamps[timestamps.length - 1] - timestamps[0];
    
    const rawData = timestamps.map((time, i) => ({
      time,
      value: normalizedSamples[i],
    }));
    
    return {
      success: true,
      data: {
        samples: normalizedSamples,
        timestamps,
        sampleRate: inferredSampleRate,
        duration,
        rawData,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse CSV file',
    };
  }
};

/**
 * Detect CSV delimiter
 */
const detectDelimiter = (line: string): string => {
  const delimiters = [',', '\t', ';', ' '];
  let maxCount = 0;
  let bestDelimiter = ',';
  
  for (const d of delimiters) {
    const count = line.split(d).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = d;
    }
  }
  
  return bestDelimiter;
};

/**
 * Normalize ECG values to typical mV range (-0.5 to 1.5)
 */
const normalizeECGValues = (samples: number[]): number[] => {
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = max - min;
  
  if (range === 0) return samples;
  
  // Check if already in reasonable mV range
  if (min >= -2 && max <= 3) {
    return samples;
  }
  
  // Normalize to 0-1.5 range (typical ECG)
  return samples.map(v => ((v - min) / range) * 1.5);
};

/**
 * Validate ECG data quality
 */
export const validateECGData = (data: ParsedECGData): {
  isValid: boolean;
  warnings: string[];
} => {
  const warnings: string[] = [];
  
  if (data.samples.length < 250) {
    warnings.push('Very short recording (less than 1 second at 250Hz)');
  }
  
  if (data.sampleRate < 100) {
    warnings.push('Low sample rate detected - may affect accuracy');
  }
  
  // Check for flat-line or constant values
  const uniqueValues = new Set(data.samples.slice(0, 100));
  if (uniqueValues.size < 5) {
    warnings.push('Signal appears to have very low variation');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
  };
};

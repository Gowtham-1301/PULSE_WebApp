import * as tf from '@tensorflow/tfjs';

export interface ModelPrediction {
  label: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface ECGModelConfig {
  inputShape: number[];
  classLabels: string[];
}

// Default class labels for ECG classification
const DEFAULT_LABELS = ['Normal', 'SVEB', 'VEB', 'Fusion', 'Unknown'];

let model: tf.LayersModel | null = null;
let modelConfig: ECGModelConfig = {
  inputShape: [250, 1], // 1 second at 250Hz, 1 channel
  classLabels: DEFAULT_LABELS,
};

export const loadModelFromFile = async (file: File): Promise<boolean> => {
  try {
    // Handle .h5 or folder upload (model.json + weights)
    if (file.name.endsWith('.json')) {
      // Load from JSON + weights
      const modelUrl = URL.createObjectURL(file);
      model = await tf.loadLayersModel(modelUrl);
      URL.revokeObjectURL(modelUrl);
    } else if (file.name.endsWith('.h5')) {
      // For .h5 files, we need to convert them first
      // This requires the model to be converted to TensorFlow.js format
      throw new Error('Please convert your .h5 model to TensorFlow.js format using tensorflowjs_converter');
    }
    
    console.log('Model loaded successfully');
    console.log('Input shape:', model?.inputs[0].shape);
    console.log('Output shape:', model?.outputs[0].shape);
    
    return true;
  } catch (error) {
    console.error('Error loading model:', error);
    return false;
  }
};

export const loadModelFromUrl = async (url: string): Promise<boolean> => {
  try {
    model = await tf.loadLayersModel(url);
    console.log('Model loaded from URL successfully');
    return true;
  } catch (error) {
    console.error('Error loading model from URL:', error);
    return false;
  }
};

export const loadModelFromIndexedDB = async (modelName: string = 'ecg-model'): Promise<boolean> => {
  try {
    model = await tf.loadLayersModel(`indexeddb://${modelName}`);
    console.log('Model loaded from IndexedDB');
    return true;
  } catch (error) {
    console.error('Model not found in IndexedDB:', error);
    return false;
  }
};

export const saveModelToIndexedDB = async (modelName: string = 'ecg-model'): Promise<boolean> => {
  if (!model) return false;
  try {
    await model.save(`indexeddb://${modelName}`);
    console.log('Model saved to IndexedDB');
    return true;
  } catch (error) {
    console.error('Error saving model:', error);
    return false;
  }
};

export const isModelLoaded = (): boolean => {
  return model !== null;
};

export const setModelConfig = (config: Partial<ECGModelConfig>): void => {
  modelConfig = { ...modelConfig, ...config };
};

export const getModelConfig = (): ECGModelConfig => modelConfig;

export const preprocessECGData = (data: number[]): tf.Tensor => {
  // Normalize data to 0-1 range
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const normalized = data.map(v => (v - min) / range);
  
  // Reshape to match model input
  const targetLength = modelConfig.inputShape[0];
  
  // Resample if necessary
  let resampled: number[];
  if (normalized.length !== targetLength) {
    resampled = resampleSignal(normalized, targetLength);
  } else {
    resampled = normalized;
  }
  
  // Create tensor with correct shape [batch, timesteps, channels]
  return tf.tensor3d([resampled.map(v => [v])]);
};

const resampleSignal = (signal: number[], targetLength: number): number[] => {
  const result: number[] = [];
  const ratio = (signal.length - 1) / (targetLength - 1);
  
  for (let i = 0; i < targetLength; i++) {
    const pos = i * ratio;
    const low = Math.floor(pos);
    const high = Math.ceil(pos);
    const weight = pos - low;
    
    if (high >= signal.length) {
      result.push(signal[signal.length - 1]);
    } else {
      result.push(signal[low] * (1 - weight) + signal[high] * weight);
    }
  }
  
  return result;
};

export const predict = async (ecgData: number[]): Promise<ModelPrediction | null> => {
  if (!model) {
    console.error('Model not loaded');
    return null;
  }
  
  try {
    const inputTensor = preprocessECGData(ecgData);
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();
    
    // Find max probability and corresponding label
    const maxIdx = probabilities.indexOf(Math.max(...Array.from(probabilities)));
    const label = modelConfig.classLabels[maxIdx] || 'Unknown';
    const confidence = probabilities[maxIdx] * 100;
    
    const probs: Record<string, number> = {};
    modelConfig.classLabels.forEach((label, idx) => {
      probs[label] = (probabilities[idx] || 0) * 100;
    });
    
    return { label, confidence, probabilities: probs };
  } catch (error) {
    console.error('Prediction error:', error);
    return null;
  }
};

export const disposeModel = (): void => {
  if (model) {
    model.dispose();
    model = null;
  }
};

// Simulated prediction for when no model is loaded
export const simulatePrediction = (
  heartRate: number,
  hrvSdnn: number
): ModelPrediction => {
  // Simple rule-based simulation
  let label = 'Normal';
  let confidence = 92 + Math.random() * 6;
  
  if (heartRate < 60) {
    label = 'SVEB';
    confidence = 85 + Math.random() * 10;
  } else if (heartRate > 100) {
    label = 'VEB';
    confidence = 80 + Math.random() * 12;
  } else if (hrvSdnn < 20) {
    label = 'Fusion';
    confidence = 75 + Math.random() * 15;
  }
  
  const probabilities: Record<string, number> = {
    Normal: label === 'Normal' ? confidence : (100 - confidence) / 4,
    SVEB: label === 'SVEB' ? confidence : (100 - confidence) / 4,
    VEB: label === 'VEB' ? confidence : (100 - confidence) / 4,
    Fusion: label === 'Fusion' ? confidence : (100 - confidence) / 4,
    Unknown: 1,
  };
  
  return { label, confidence, probabilities };
};

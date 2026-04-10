import * as tf from '@tensorflow/tfjs';

export interface ModelPrediction {
  label: string;
  confidence: number;
  probabilities: Record<string, number>;
  uncertainty?: UncertaintyEstimate;
}

export interface UncertaintyEstimate {
  epistemic: number;
  aleatoric: number;
  total: number;
  confidenceInterval95: { lower: number; upper: number };
}

export interface ECGModelConfig {
  inputShape: number[];
  classLabels: string[];
}

// 9-class labels matching the TCN-BiLSTM-Attention model
const DEFAULT_LABELS = [
  'Normal Sinus Rhythm',
  'Atrial Fibrillation',
  'SVEB',
  'VEB',
  'Ventricular Tachycardia',
  'STEMI',
  'LBBB',
  'Bradycardia',
  'Tachycardia',
];

// Base risk per class for risk fusion
export const CLASS_BASE_RISK: Record<string, number> = {
  'Normal Sinus Rhythm': 5,
  'Atrial Fibrillation': 25,
  'SVEB': 30,
  'VEB': 50,
  'Ventricular Tachycardia': 70,
  'STEMI': 95,
  'LBBB': 40,
  'Bradycardia': 15,
  'Tachycardia': 20,
};

let model: tf.LayersModel | null = null;
let modelConfig: ECGModelConfig = {
  inputShape: [360, 1],
  classLabels: DEFAULT_LABELS,
};

export const loadModelFromFile = async (file: File): Promise<boolean> => {
  try {
    if (file.name.endsWith('.json')) {
      const modelUrl = URL.createObjectURL(file);
      model = await tf.loadLayersModel(modelUrl);
      URL.revokeObjectURL(modelUrl);
    } else if (file.name.endsWith('.h5')) {
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

export const isModelLoaded = (): boolean => model !== null;

export const setModelConfig = (config: Partial<ECGModelConfig>): void => {
  modelConfig = { ...modelConfig, ...config };
};

export const getModelConfig = (): ECGModelConfig => modelConfig;

export const preprocessECGData = (data: number[]): tf.Tensor => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const normalized = data.map(v => (v - min) / range);

  const targetLength = modelConfig.inputShape[0];
  const resampled = normalized.length !== targetLength
    ? resampleSignal(normalized, targetLength)
    : normalized;

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
    inputTensor.dispose();
    prediction.dispose();

    const maxIdx = probabilities.indexOf(Math.max(...Array.from(probabilities)));
    const label = modelConfig.classLabels[maxIdx] || 'Unknown';
    const confidence = probabilities[maxIdx] * 100;

    const probs: Record<string, number> = {};
    modelConfig.classLabels.forEach((l, idx) => {
      probs[l] = (probabilities[idx] || 0) * 100;
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

// Simulated prediction for when no model is loaded — now 9-class
export const simulatePrediction = (
  heartRate: number,
  hrvSdnn: number
): ModelPrediction => {
  let label = 'Normal Sinus Rhythm';
  let confidence = 92 + Math.random() * 6;

  if (heartRate < 55) {
    label = 'Bradycardia';
    confidence = 85 + Math.random() * 10;
  } else if (heartRate > 110) {
    label = 'Tachycardia';
    confidence = 83 + Math.random() * 10;
  } else if (hrvSdnn < 20) {
    label = 'SVEB';
    confidence = 75 + Math.random() * 15;
  }

  const probabilities: Record<string, number> = {};
  const remaining = 100 - confidence;
  modelConfig.classLabels.forEach(l => {
    probabilities[l] = l === label ? confidence : remaining / (modelConfig.classLabels.length - 1);
  });

  // Simulated uncertainty
  const epistemic = 0.05 + Math.random() * 0.15;
  const aleatoric = 0.03 + Math.random() * 0.1;
  const uncertainty: UncertaintyEstimate = {
    epistemic,
    aleatoric,
    total: epistemic + aleatoric,
    confidenceInterval95: {
      lower: Math.max(0, confidence - 15 - Math.random() * 10),
      upper: Math.min(100, confidence + 5 + Math.random() * 5),
    },
  };

  return { label, confidence, probabilities, uncertainty };
};

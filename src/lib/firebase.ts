import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, Database, DataSnapshot, off } from 'firebase/database';

// Firebase configuration - user needs to set these
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let firebaseApp: FirebaseApp | null = null;
let database: Database | null = null;

export const initializeFirebase = (config: FirebaseConfig): boolean => {
  try {
    firebaseApp = initializeApp(config);
    database = getDatabase(firebaseApp);
    return true;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return false;
  }
};

export const isFirebaseInitialized = (): boolean => {
  return firebaseApp !== null && database !== null;
};

export interface ECGRealtimeData {
  timestamp: number;
  value: number;
  samplingRate?: number;
}

export const subscribeToECGData = (
  path: string,
  onData: (data: ECGRealtimeData[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (!database) {
    onError?.(new Error('Firebase not initialized'));
    return () => {};
  }

  const ecgRef = ref(database, path);
  
  const handleSnapshot = (snapshot: DataSnapshot) => {
    const rawData = snapshot.val();
    if (!rawData) return;
    
    // Handle different data formats from ESP32
    let dataPoints: ECGRealtimeData[] = [];
    
    if (Array.isArray(rawData)) {
      // Direct array format
      dataPoints = rawData.map((val, idx) => ({
        timestamp: Date.now() + idx,
        value: typeof val === 'number' ? val : parseFloat(val),
        samplingRate: 250,
      }));
    } else if (typeof rawData === 'object') {
      // Object with timestamp keys
      dataPoints = Object.entries(rawData).map(([key, val]) => ({
        timestamp: parseInt(key) || Date.now(),
        value: typeof val === 'number' ? val : parseFloat(val as string),
        samplingRate: 250,
      }));
    }
    
    onData(dataPoints);
  };

  onValue(ecgRef, handleSnapshot, (error) => {
    onError?.(error);
  });

  // Return unsubscribe function
  return () => {
    off(ecgRef);
  };
};

export const getFirebaseConfig = (): FirebaseConfig | null => {
  const stored = localStorage.getItem('firebase_config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const saveFirebaseConfig = (config: FirebaseConfig): void => {
  localStorage.setItem('firebase_config', JSON.stringify(config));
};

export const clearFirebaseConfig = (): void => {
  localStorage.removeItem('firebase_config');
};

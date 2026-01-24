import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Wifi, Brain, Database, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Header from '@/components/layout/Header';
import { useToast } from '@/hooks/use-toast';
import { 
  initializeFirebase, 
  isFirebaseInitialized, 
  getFirebaseConfig, 
  saveFirebaseConfig,
  clearFirebaseConfig 
} from '@/lib/firebase';
import { 
  isModelLoaded, 
  loadModelFromIndexedDB, 
  loadModelFromFile,
  saveModelToIndexedDB,
  disposeModel,
  setModelConfig,
  getModelConfig
} from '@/lib/tensorflowModel';

interface SettingsProps {
  onNavigate: (page: string) => void;
}

const Settings = ({ onNavigate }: SettingsProps) => {
  const { toast } = useToast();
  
  // Firebase state
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });
  const [ecgDataPath, setEcgDataPath] = useState('ecg/realtime');
  
  // Model state
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [modelLabels, setModelLabels] = useState('Normal,SVEB,VEB,Fusion,Unknown');
  const [inputLength, setInputLength] = useState(250);
  
  // Settings
  const [useSimulation, setUseSimulation] = useState(true);
  const [autoSaveSession, setAutoSaveSession] = useState(true);

  useEffect(() => {
    // Check existing Firebase config
    const savedConfig = getFirebaseConfig();
    if (savedConfig) {
      setFirebaseConfig(savedConfig);
      const success = initializeFirebase(savedConfig);
      setFirebaseConnected(success);
    }
    
    // Check for saved model
    loadModelFromIndexedDB().then(loaded => {
      setModelLoaded(loaded);
    });
    
    // Load saved settings
    const savedPath = localStorage.getItem('ecg_data_path');
    if (savedPath) setEcgDataPath(savedPath);
    
    const savedSimulation = localStorage.getItem('use_simulation');
    if (savedSimulation !== null) setUseSimulation(savedSimulation === 'true');
    
    const savedAutoSave = localStorage.getItem('auto_save_session');
    if (savedAutoSave !== null) setAutoSaveSession(savedAutoSave === 'true');
  }, []);

  const handleConnectFirebase = () => {
    if (!firebaseConfig.databaseURL) {
      toast({
        variant: 'destructive',
        title: 'Missing Configuration',
        description: 'Please provide at least the Database URL',
      });
      return;
    }

    const success = initializeFirebase(firebaseConfig);
    if (success) {
      saveFirebaseConfig(firebaseConfig);
      localStorage.setItem('ecg_data_path', ecgDataPath);
      setFirebaseConnected(true);
      toast({
        title: 'Firebase Connected',
        description: 'Successfully connected to Firebase Realtime Database',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: 'Failed to initialize Firebase. Check your configuration.',
      });
    }
  };

  const handleDisconnectFirebase = () => {
    clearFirebaseConfig();
    setFirebaseConnected(false);
    setFirebaseConfig({
      apiKey: '',
      authDomain: '',
      databaseURL: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
    });
    toast({
      title: 'Disconnected',
      description: 'Firebase connection removed',
    });
  };

  const handleModelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoadingModel(true);
    try {
      // Configure model before loading
      setModelConfig({
        inputShape: [inputLength, 1],
        classLabels: modelLabels.split(',').map(l => l.trim()),
      });

      if (file.name.endsWith('.h5')) {
        toast({
          variant: 'destructive',
          title: 'Convert Model First',
          description: 'Please convert your .h5 model to TensorFlow.js format using tensorflowjs_converter',
        });
        return;
      }

      const success = await loadModelFromFile(file);
      if (success) {
        await saveModelToIndexedDB();
        setModelLoaded(true);
        toast({
          title: 'Model Loaded',
          description: 'Your ECG classification model is now active',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Load Failed',
          description: 'Failed to load the model. Make sure it\'s in TensorFlow.js format.',
        });
      }
    } catch (error) {
      console.error('Model load error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while loading the model',
      });
    } finally {
      setIsLoadingModel(false);
    }
  };

  const handleRemoveModel = () => {
    disposeModel();
    setModelLoaded(false);
    toast({
      title: 'Model Removed',
      description: 'The model has been removed. Using simulation mode.',
    });
  };

  const saveSettings = () => {
    localStorage.setItem('use_simulation', String(useSimulation));
    localStorage.setItem('auto_save_session', String(autoSaveSession));
    toast({
      title: 'Settings Saved',
      description: 'Your preferences have been updated',
    });
  };

  return (
    <div className="min-h-screen gradient-cyber">
      <Header onNavigate={onNavigate} currentPage="settings" />

      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold flex items-center gap-3">
              <SettingsIcon className="w-7 h-7 text-primary" />
              Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Configure sensor connections, AI model, and preferences
            </p>
          </div>

          <div className="space-y-6">
            {/* Firebase Connection */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${firebaseConnected ? 'bg-risk-low/10' : 'bg-muted'}`}>
                    <Wifi className={`w-5 h-5 ${firebaseConnected ? 'text-risk-low' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg">ESP32 + Firebase Connection</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect to your ECG sensor via Firebase Realtime Database
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {firebaseConnected ? (
                    <span className="flex items-center gap-1 text-risk-low text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground text-sm">
                      <XCircle className="w-4 h-4" />
                      Not Connected
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Database URL *</Label>
                  <Input
                    value={firebaseConfig.databaseURL}
                    onChange={(e) => setFirebaseConfig(prev => ({ ...prev, databaseURL: e.target.value }))}
                    placeholder="https://your-project.firebaseio.com"
                    className="mt-1 bg-background/50"
                  />
                </div>
                <div>
                  <Label>ECG Data Path</Label>
                  <Input
                    value={ecgDataPath}
                    onChange={(e) => setEcgDataPath(e.target.value)}
                    placeholder="ecg/realtime"
                    className="mt-1 bg-background/50"
                  />
                </div>
                <div>
                  <Label>API Key</Label>
                  <Input
                    value={firebaseConfig.apiKey}
                    onChange={(e) => setFirebaseConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Your Firebase API Key"
                    className="mt-1 bg-background/50"
                  />
                </div>
                <div>
                  <Label>Project ID</Label>
                  <Input
                    value={firebaseConfig.projectId}
                    onChange={(e) => setFirebaseConfig(prev => ({ ...prev, projectId: e.target.value }))}
                    placeholder="your-project-id"
                    className="mt-1 bg-background/50"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                {firebaseConnected ? (
                  <Button variant="destructive" onClick={handleDisconnectFirebase}>
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={handleConnectFirebase} className="bg-primary hover:bg-primary/90">
                    Connect to Firebase
                  </Button>
                )}
              </div>
            </div>

            {/* TensorFlow.js Model */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${modelLoaded ? 'bg-accent/10' : 'bg-muted'}`}>
                    <Brain className={`w-5 h-5 ${modelLoaded ? 'text-accent' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg">AI Classification Model</h3>
                    <p className="text-sm text-muted-foreground">
                      Load your trained TensorFlow.js model for ECG classification
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {modelLoaded ? (
                    <span className="flex items-center gap-1 text-accent text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Model Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground text-sm">
                      <AlertCircle className="w-4 h-4" />
                      Using Simulation
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Class Labels (comma-separated)</Label>
                  <Input
                    value={modelLabels}
                    onChange={(e) => setModelLabels(e.target.value)}
                    placeholder="Normal,SVEB,VEB,Fusion,Unknown"
                    className="mt-1 bg-background/50"
                  />
                </div>
                <div>
                  <Label>Input Length (samples)</Label>
                  <Input
                    type="number"
                    value={inputLength}
                    onChange={(e) => setInputLength(parseInt(e.target.value) || 250)}
                    placeholder="250"
                    className="mt-1 bg-background/50"
                  />
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <Input
                  type="file"
                  accept=".json,.h5,.tflite"
                  onChange={handleModelUpload}
                  className="max-w-xs"
                  disabled={isLoadingModel}
                />
                {isLoadingModel && <Loader2 className="w-4 h-4 animate-spin" />}
                {modelLoaded && (
                  <Button variant="outline" onClick={handleRemoveModel}>
                    Remove Model
                  </Button>
                )}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold">Note:</span> Upload a TensorFlow.js model (model.json + weight files). 
                  If you have a .h5 model, convert it first using:
                  <code className="block mt-1 p-2 bg-background/50 rounded">
                    tensorflowjs_converter --input_format keras model.h5 tfjs_model/
                  </code>
                </p>
              </div>
            </div>

            {/* General Settings */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-muted">
                  <Database className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg">General Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure app behavior and data handling
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Use Simulation Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Generate simulated ECG data when no sensor is connected
                    </p>
                  </div>
                  <Switch
                    checked={useSimulation}
                    onCheckedChange={setUseSimulation}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Auto-Save Sessions</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically save sessions to the database when stopped
                    </p>
                  </div>
                  <Switch
                    checked={autoSaveSession}
                    onCheckedChange={setAutoSaveSession}
                  />
                </div>
              </div>

              <Button onClick={saveSettings} className="mt-4 bg-primary hover:bg-primary/90">
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;

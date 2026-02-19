import { useState, useRef, useCallback } from 'react';
import { Upload, Brain, CheckCircle, AlertTriangle, Loader2, RefreshCw, Trash2, FileCode, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  loadModelFromUrl,
  isModelLoaded,
  setModelConfig,
  loadModelFromIndexedDB,
  saveModelToIndexedDB,
} from '@/lib/tensorflowModel';

interface ModelStatus {
  state: 'idle' | 'uploading' | 'validating' | 'loading' | 'ready' | 'error' | 'needs_conversion';
  message: string;
  fileSizeMB?: string;
  modelJsonUrl?: string;
}

interface MLModelUploaderProps {
  onModelReady: (loaded: boolean) => void;
}

const MLModelUploader = ({ onModelReady }: MLModelUploaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ModelStatus>({ state: 'idle', message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Try loading model from IndexedDB cache on mount
  const tryLoadFromCache = useCallback(async () => {
    setStatus({ state: 'loading', message: 'Looking for cached model...' });
    const loaded = await loadModelFromIndexedDB('ecg-user-model');
    if (loaded) {
      setModelConfig({ inputShape: [360, 1], classLabels: ['Normal', 'SVEB', 'VEB', 'Fusion', 'Unknown'] });
      setStatus({ state: 'ready', message: 'Model loaded from cache' });
      onModelReady(true);
    } else {
      setStatus({ state: 'idle', message: '' });
    }
  }, [onModelReady]);

  const handleFileSelect = async (file: File) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Sign in required', description: 'Please sign in to upload your model.' });
      return;
    }

    const isH5 = file.name.endsWith('.h5') || file.name.endsWith('.hdf5');
    const isJson = file.name.endsWith('.json');
    const isBin = file.name.endsWith('.bin');

    if (!isH5 && !isJson && !isBin) {
      toast({ variant: 'destructive', title: 'Unsupported file', description: 'Upload a .h5, model.json, or .bin file.' });
      return;
    }

    // If it's a TF.js model.json, load directly in-browser
    if (isJson && file.name.includes('model')) {
      await loadTFJSModelFromFile(file);
      return;
    }

    // Upload to storage
    setStatus({ state: 'uploading', message: `Uploading ${file.name}...` });
    setUploadProgress(0);

    const storagePath = `${user.id}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('ml-models')
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      setStatus({ state: 'error', message: `Upload failed: ${uploadError.message}` });
      return;
    }

    setUploadProgress(60);
    setStatus({ state: 'validating', message: 'Validating model file...' });

    if (isH5) {
      // Call the convert-model function for validation + instructions
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      try {
        const response = await supabase.functions.invoke('convert-model', {
          body: { storagePath },
        });

        setUploadProgress(100);

        if (response.error) throw new Error(response.error.message);

        const result = response.data;
        setStatus({
          state: 'needs_conversion',
          message: result.message,
          fileSizeMB: result.fileSizeMB,
        });
        onModelReady(false);
      } catch (err) {
        setStatus({ state: 'error', message: err instanceof Error ? err.message : 'Validation failed' });
      }
    } else if (isBin) {
      setStatus({ state: 'idle', message: `${file.name} uploaded. Now upload your model.json to complete the model.` });
      setUploadProgress(0);
      toast({ title: 'Weights uploaded', description: 'Now upload your model.json file.' });
    }
  };

  const loadTFJSModelFromFile = async (jsonFile: File) => {
    setStatus({ state: 'loading', message: 'Loading TF.js model into browser...' });
    try {
      const modelUrl = URL.createObjectURL(jsonFile);
      const loaded = await loadModelFromUrl(modelUrl);
      URL.revokeObjectURL(modelUrl);

      if (loaded) {
        setModelConfig({
          inputShape: [360, 1],
          classLabels: ['Normal', 'SVEB', 'VEB', 'Fusion', 'Unknown'],
        });
        await saveModelToIndexedDB('ecg-user-model');
        setStatus({ state: 'ready', message: 'Model ready — real-time inference active' });
        onModelReady(true);
        toast({ title: '🧠 Model Loaded!', description: 'Your ML model is running real-time ECG classification.' });
      } else {
        setStatus({ state: 'error', message: 'Failed to parse model.json. Make sure all .bin weight files are in the same folder.' });
      }
    } catch (err) {
      setStatus({ state: 'error', message: err instanceof Error ? err.message : 'Failed to load model' });
    }
  };

  const loadFromStorage = async () => {
    if (!user) return;
    setStatus({ state: 'loading', message: 'Fetching model from cloud storage...' });

    try {
      const response = await supabase.functions.invoke('load-tfjs-model', {});
      if (response.error) throw new Error(response.error.message);

      const { modelJsonUrl, hasConvertedModel } = response.data;

      if (!hasConvertedModel || !modelJsonUrl) {
        setStatus({ state: 'needs_conversion', message: 'No converted TF.js model found. Please convert your .h5 and upload model.json.' });
        return;
      }

      const loaded = await loadModelFromUrl(modelJsonUrl);
      if (loaded) {
        setModelConfig({ inputShape: [360, 1], classLabels: ['Normal', 'SVEB', 'VEB', 'Fusion', 'Unknown'] });
        await saveModelToIndexedDB('ecg-user-model');
        setStatus({ state: 'ready', message: 'Model loaded from cloud storage' });
        onModelReady(true);
        toast({ title: '🧠 Model Ready', description: 'Your custom ML model is now running real-time inference.' });
      } else {
        setStatus({ state: 'error', message: 'Failed to load model from storage.' });
      }
    } catch (err) {
      setStatus({ state: 'error', message: err instanceof Error ? err.message : 'Failed to load from storage' });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const getStatusIcon = () => {
    switch (status.state) {
      case 'ready': return <CheckCircle className="w-5 h-5 text-risk-low" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-risk-high" />;
      case 'needs_conversion': return <AlertTriangle className="w-5 h-5 text-risk-moderate" />;
      case 'uploading':
      case 'validating':
      case 'loading': return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      default: return <Brain className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (status.state) {
      case 'ready': return <Badge className="bg-risk-low/20 text-risk-low border-risk-low/30">Active</Badge>;
      case 'needs_conversion': return <Badge className="bg-risk-moderate/20 text-risk-moderate border-risk-moderate/30">Conversion Required</Badge>;
      case 'error': return <Badge className="bg-risk-high/20 text-risk-high border-risk-high/30">Error</Badge>;
      case 'uploading':
      case 'validating':
      case 'loading': return <Badge className="bg-primary/20 text-primary border-primary/30">Processing</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">No Model</Badge>;
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-display font-semibold text-sm">ML Model</h3>
            <p className="text-xs text-muted-foreground">Custom ECG classifier</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Status message */}
      {status.message && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          {status.message}
        </p>
      )}

      {/* Upload progress */}
      {(status.state === 'uploading' || status.state === 'validating') && (
        <div className="w-full bg-muted/30 rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Conversion instructions */}
      {status.state === 'needs_conversion' && (
        <div className="p-3 rounded-lg bg-risk-moderate/10 border border-risk-moderate/20 space-y-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-risk-moderate shrink-0" />
            <p className="text-xs font-medium text-risk-moderate">Conversion steps:</p>
          </div>
          <ol className="space-y-1 text-xs text-muted-foreground ml-6 list-decimal">
            <li><code className="bg-muted/50 px-1 rounded">pip install tensorflowjs</code></li>
            <li><code className="bg-muted/50 px-1 rounded">tensorflowjs_converter --input_format=keras model.h5 ./tfjs_out/</code></li>
            <li>Upload the <strong>model.json</strong> + all <strong>.bin</strong> files here</li>
          </ol>
        </div>
      )}

      {/* Ready state info */}
      {status.state === 'ready' && (
        <div className="p-3 rounded-lg bg-risk-low/10 border border-risk-low/20">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-risk-low shrink-0" />
            <div>
              <p className="text-xs font-medium text-risk-low">Real-time inference active</p>
              <p className="text-xs text-muted-foreground">360Hz input • 5-class output (NSVFU)</p>
            </div>
          </div>
        </div>
      )}

      {/* Drop zone */}
      {status.state !== 'ready' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-border/40 hover:border-primary/50 hover:bg-primary/5'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Drop <strong>.h5</strong> or <strong>model.json</strong> + <strong>.bin</strong> here
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".h5,.hdf5,.json,.bin"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {status.state === 'idle' && (
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={tryLoadFromCache}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Load Cached
          </Button>
        )}
        {status.state === 'idle' && (
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={loadFromStorage}>
            <FileCode className="w-3 h-3 mr-1" />
            Load from Cloud
          </Button>
        )}
        {status.state === 'ready' && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs text-risk-high border-risk-high/30 hover:bg-risk-high/10"
            onClick={() => {
              setStatus({ state: 'idle', message: '' });
              onModelReady(false);
            }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Unload
          </Button>
        )}
        {(status.state === 'error' || status.state === 'needs_conversion') && (
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setStatus({ state: 'idle', message: '' })}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};

export default MLModelUploader;

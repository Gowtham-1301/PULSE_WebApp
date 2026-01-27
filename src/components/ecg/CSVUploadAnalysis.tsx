import { useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Activity, Heart, TrendingUp, Zap, Clock, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCSVAnalysis, ECGAnalysisResult } from '@/hooks/useCSVAnalysis';
import ECGWaveform from './ECGWaveform';
import { cn } from '@/lib/utils';

const CSVUploadAnalysis = () => {
  const {
    isAnalyzing,
    progress,
    result,
    error,
    parsedData,
    warnings,
    analyzeCSV,
    reset,
  } = useCSVAnalysis();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      analyzeCSV(file);
    }
  }, [analyzeCSV]);
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      analyzeCSV(file);
    }
  }, [analyzeCSV]);
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!parsedData && !isAnalyzing && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all duration-300"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-12 h-12 mx-auto mb-4 text-primary/60" />
          <h3 className="text-lg font-medium text-foreground mb-2">Upload ECG Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop a CSV file or click to browse
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Single column (values only)</Badge>
            <Badge variant="outline">Two columns (time, value)</Badge>
            <Badge variant="outline">MIT-BIH format</Badge>
          </div>
        </div>
      )}
      
      {/* Analyzing Progress */}
      {isAnalyzing && (
        <Card className="p-6 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <Activity className="w-6 h-6 text-primary animate-pulse" />
            <h3 className="text-lg font-medium">Analyzing ECG Data...</h3>
          </div>
          <Progress value={progress} className="h-2 mb-2" />
          <p className="text-sm text-muted-foreground">
            {progress < 30 && 'Parsing CSV file...'}
            {progress >= 30 && progress < 50 && 'Validating data quality...'}
            {progress >= 50 && progress < 70 && 'Detecting R-peaks...'}
            {progress >= 70 && progress < 90 && 'Calculating metrics...'}
            {progress >= 90 && 'Classifying rhythm...'}
          </p>
        </Card>
      )}
      
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Results */}
      {result && parsedData && (
        <div className="space-y-6">
          {/* Waveform Preview */}
          <Card className="p-4 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              ECG Waveform Preview
            </h3>
            <div className="h-64">
              <ECGWaveform
                data={parsedData.rawData.slice(0, 750)} // Show first 3 seconds
                peaks={result.peaks.peaks}
                riskLevel={result.riskLevel}
                showPeaks={true}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>{result.peakCount} R-peaks detected</span>
              <span>Duration: {parsedData.duration.toFixed(1)}s | Sample Rate: {parsedData.sampleRate}Hz</span>
            </div>
          </Card>
          
          {/* Classification Card */}
          <Card className={cn(
            "p-6 backdrop-blur-sm border-2",
            result.riskLevel === 'low' && "bg-green-500/10 border-green-500/30",
            result.riskLevel === 'moderate' && "bg-yellow-500/10 border-yellow-500/30",
            result.riskLevel === 'high' && "bg-red-500/10 border-red-500/30",
          )}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {result.riskLevel === 'low' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                  {result.riskLevel === 'moderate' && <AlertCircle className="w-6 h-6 text-yellow-500" />}
                  {result.riskLevel === 'high' && <AlertCircle className="w-6 h-6 text-red-500" />}
                  <h3 className="text-xl font-bold">{result.classification}</h3>
                </div>
                <p className="text-muted-foreground">
                  Confidence: {result.confidence}%
                </p>
              </div>
              <Badge className={cn(
                result.riskLevel === 'low' && "bg-green-500",
                result.riskLevel === 'moderate' && "bg-yellow-500",
                result.riskLevel === 'high' && "bg-red-500",
              )}>
                {result.riskLevel.toUpperCase()} RISK
              </Badge>
            </div>
          </Card>
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<Heart className="w-5 h-5" />}
              label="Avg Heart Rate"
              value={result.heartRateAvg}
              unit="BPM"
              highlight
            />
            <MetricCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="HR Range"
              value={`${result.heartRateMin} - ${result.heartRateMax}`}
              unit="BPM"
            />
            <MetricCard
              icon={<Clock className="w-5 h-5" />}
              label="Avg RR Interval"
              value={result.rrIntervalAvg}
              unit="sec"
            />
            <MetricCard
              icon={<Zap className="w-5 h-5" />}
              label="QRS Duration"
              value={result.qrsDuration}
              unit="sec"
            />
            <MetricCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="HRV SDNN"
              value={result.hrvSdnn}
              unit="ms"
            />
            <MetricCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="HRV RMSSD"
              value={result.hrvRmssd}
              unit="ms"
            />
            <MetricCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="pNN50"
              value={result.hrvPnn50}
              unit="%"
            />
            <MetricCard
              icon={<Activity className="w-5 h-5" />}
              label="Signal Quality"
              value={result.signalQuality}
              unit=""
              valueColor={
                result.signalQuality === 'good' ? 'text-green-500' :
                result.signalQuality === 'fair' ? 'text-yellow-500' : 'text-red-500'
              }
            />
          </div>
          
          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={reset} variant="outline" className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Analyze Another File
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90">
              <FileText className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  highlight?: boolean;
  valueColor?: string;
}

const MetricCard = ({ icon, label, value, unit, highlight, valueColor }: MetricCardProps) => (
  <Card className={cn(
    "p-4 bg-card/50 backdrop-blur-sm",
    highlight && "ring-1 ring-primary/50"
  )}>
    <div className="flex items-center gap-2 text-muted-foreground mb-2">
      {icon}
      <span className="text-xs uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className={cn("text-2xl font-bold", valueColor || "text-foreground")}>
        {value}
      </span>
      {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
    </div>
  </Card>
);

export default CSVUploadAnalysis;

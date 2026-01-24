import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HealthInsights {
  summary: string;
  insights: string[];
  suggestions: string[];
  warnings: string[];
  positives: string[];
}

interface ECGMetrics {
  heartRate: number;
  heartRateMin?: number;
  heartRateMax?: number;
  rrInterval: number;
  qrsDuration: number;
  qtInterval: number;
  hrvSdnn: number;
  hrvRmssd: number;
}

interface UserProfile {
  age?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  healthConditions?: string[];
}

interface UseHealthInsightsParams {
  metrics: ECGMetrics;
  classification: {
    label: string;
    confidence: number;
  };
  riskLevel: 'low' | 'moderate' | 'high';
  profile?: UserProfile;
  historicalAvgHR?: number;
}

export const useHealthInsights = () => {
  const [insights, setInsights] = useState<HealthInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInsights = useCallback(async (params: UseHealthInsightsParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('health-insights', {
        body: params,
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setInsights(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get health insights';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'AI Insights Error',
        description: message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearInsights = useCallback(() => {
    setInsights(null);
    setError(null);
  }, []);

  return {
    insights,
    isLoading,
    error,
    fetchInsights,
    clearInsights,
  };
};

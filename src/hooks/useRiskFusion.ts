import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RiskFusionResult {
  finalRiskLevel: 'low' | 'moderate' | 'high';
  ecgRiskScore: number;
  clinicalRiskScore: number;
  fusedRiskScore: number;
  riskFactors: string[];
  protectiveFactors: string[];
  confidence: number;
  recommendations: string[];
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

interface ECGClassification {
  label: string;
  confidence: number;
}

interface ClinicalProfile {
  age?: number;
  bmi?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  cholesterolTotal?: number;
  cholesterolHdl?: number;
  cholesterolLdl?: number;
  fastingBloodSugar?: number;
  smokingStatus?: 'never' | 'former' | 'current';
  exerciseFrequency?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  familyHeartDisease?: boolean;
  diabetesStatus?: 'none' | 'prediabetic' | 'type1' | 'type2';
  healthConditions?: string[];
}

interface UseRiskFusionParams {
  ecgMetrics: ECGMetrics;
  ecgClassification: ECGClassification;
  clinicalProfile: ClinicalProfile;
  isLiveMonitoring?: boolean;
}

export const useRiskFusion = () => {
  const [result, setResult] = useState<RiskFusionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const calculateRisk = useCallback(async (params: UseRiskFusionParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('risk-fusion', {
        body: params,
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      return data as RiskFusionResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate risk fusion';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Risk Calculation Error',
        description: message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    isLoading,
    error,
    calculateRisk,
    clearResult,
  };
};

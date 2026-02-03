import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ClinicalProfileData {
  full_name: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  health_conditions: string[] | null;
  allergies: string[] | null;
  // Clinical fields
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  cholesterol_total: number | null;
  cholesterol_hdl: number | null;
  cholesterol_ldl: number | null;
  fasting_blood_sugar: number | null;
  smoking_status: 'never' | 'former' | 'current' | null;
  exercise_frequency: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  family_heart_disease: boolean;
  diabetes_status: 'none' | 'prediabetic' | 'type1' | 'type2' | null;
  medications: string[] | null;
}

const defaultProfile: ClinicalProfileData = {
  full_name: '',
  age: null,
  weight: null,
  height: null,
  bmi: null,
  health_conditions: [],
  allergies: [],
  blood_pressure_systolic: null,
  blood_pressure_diastolic: null,
  cholesterol_total: null,
  cholesterol_hdl: null,
  cholesterol_ldl: null,
  fasting_blood_sugar: null,
  smoking_status: null,
  exercise_frequency: null,
  family_heart_disease: false,
  diabetes_status: null,
  medications: [],
};

export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ClinicalProfileData>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile({
            full_name: data.full_name,
            age: data.age,
            weight: data.weight ? Number(data.weight) : null,
            height: data.height ? Number(data.height) : null,
            bmi: data.bmi ? Number(data.bmi) : null,
            health_conditions: data.health_conditions || [],
            allergies: data.allergies || [],
            blood_pressure_systolic: (data as Record<string, unknown>).blood_pressure_systolic as number | null,
            blood_pressure_diastolic: (data as Record<string, unknown>).blood_pressure_diastolic as number | null,
            cholesterol_total: (data as Record<string, unknown>).cholesterol_total ? Number((data as Record<string, unknown>).cholesterol_total) : null,
            cholesterol_hdl: (data as Record<string, unknown>).cholesterol_hdl ? Number((data as Record<string, unknown>).cholesterol_hdl) : null,
            cholesterol_ldl: (data as Record<string, unknown>).cholesterol_ldl ? Number((data as Record<string, unknown>).cholesterol_ldl) : null,
            fasting_blood_sugar: (data as Record<string, unknown>).fasting_blood_sugar ? Number((data as Record<string, unknown>).fasting_blood_sugar) : null,
            smoking_status: (data as Record<string, unknown>).smoking_status as ClinicalProfileData['smoking_status'],
            exercise_frequency: (data as Record<string, unknown>).exercise_frequency as ClinicalProfileData['exercise_frequency'],
            family_heart_disease: (data as Record<string, unknown>).family_heart_disease as boolean ?? false,
            diabetes_status: (data as Record<string, unknown>).diabetes_status as ClinicalProfileData['diabetes_status'],
            medications: (data as Record<string, unknown>).medications as string[] ?? [],
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load profile data',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, toast]);

  // Calculate BMI when weight or height changes
  useEffect(() => {
    if (profile.weight && profile.height) {
      const heightInMeters = profile.height / 100;
      const bmi = profile.weight / (heightInMeters * heightInMeters);
      setProfile(prev => ({ ...prev, bmi: Math.round(bmi * 10) / 10 }));
    }
  }, [profile.weight, profile.height]);

  // Save profile
  const saveProfile = useCallback(async () => {
    if (!user) return false;

    setIsSaving(true);
    try {
      // Save all profile fields - clinical fields added via migration
      // Using type assertion since new columns aren't in generated types yet
      const profileData = {
        user_id: user.id,
        full_name: profile.full_name,
        age: profile.age,
        weight: profile.weight,
        height: profile.height,
        bmi: profile.bmi,
        health_conditions: profile.health_conditions,
        allergies: profile.allergies,
        blood_pressure_systolic: profile.blood_pressure_systolic,
        blood_pressure_diastolic: profile.blood_pressure_diastolic,
        cholesterol_total: profile.cholesterol_total,
        cholesterol_hdl: profile.cholesterol_hdl,
        cholesterol_ldl: profile.cholesterol_ldl,
        fasting_blood_sugar: profile.fasting_blood_sugar,
        smoking_status: profile.smoking_status,
        exercise_frequency: profile.exercise_frequency,
        family_heart_disease: profile.family_heart_disease,
        diabetes_status: profile.diabetes_status,
        medications: profile.medications,
        updated_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from('profiles')
        .upsert(profileData as any);

      if (error) throw error;

      toast({
        title: 'Profile Saved',
        description: 'Your health profile has been updated successfully.',
      });
      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, profile, toast]);

  // Update profile field
  const updateField = useCallback(<K extends keyof ClinicalProfileData>(
    field: K,
    value: ClinicalProfileData[K]
  ) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  }, []);

  // Add/remove array items
  const addToArray = useCallback((field: 'health_conditions' | 'allergies' | 'medications', item: string) => {
    if (item && !profile[field]?.includes(item)) {
      setProfile(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), item],
      }));
    }
  }, [profile]);

  const removeFromArray = useCallback((field: 'health_conditions' | 'allergies' | 'medications', item: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: prev[field]?.filter(i => i !== item) || [],
    }));
  }, []);

  // Get clinical profile for risk fusion
  const getClinicalProfile = useCallback(() => ({
    age: profile.age ?? undefined,
    bmi: profile.bmi ?? undefined,
    bloodPressureSystolic: profile.blood_pressure_systolic ?? undefined,
    bloodPressureDiastolic: profile.blood_pressure_diastolic ?? undefined,
    cholesterolTotal: profile.cholesterol_total ?? undefined,
    cholesterolHdl: profile.cholesterol_hdl ?? undefined,
    cholesterolLdl: profile.cholesterol_ldl ?? undefined,
    fastingBloodSugar: profile.fasting_blood_sugar ?? undefined,
    smokingStatus: profile.smoking_status ?? undefined,
    exerciseFrequency: profile.exercise_frequency ?? undefined,
    familyHeartDisease: profile.family_heart_disease,
    diabetesStatus: profile.diabetes_status ?? undefined,
    healthConditions: profile.health_conditions ?? undefined,
  }), [profile]);

  // Calculate profile completeness
  const getCompleteness = useCallback(() => {
    const requiredFields = [
      profile.full_name,
      profile.age,
      profile.weight,
      profile.height,
    ];
    const clinicalFields = [
      profile.blood_pressure_systolic,
      profile.cholesterol_total,
      profile.fasting_blood_sugar,
      profile.smoking_status,
      profile.exercise_frequency,
    ];
    
    const basicComplete = requiredFields.filter(Boolean).length / requiredFields.length;
    const clinicalComplete = clinicalFields.filter(f => f !== null && f !== undefined).length / clinicalFields.length;
    
    return {
      basic: Math.round(basicComplete * 100),
      clinical: Math.round(clinicalComplete * 100),
      overall: Math.round((basicComplete * 0.4 + clinicalComplete * 0.6) * 100),
    };
  }, [profile]);

  return {
    profile,
    isLoading,
    isSaving,
    saveProfile,
    updateField,
    addToArray,
    removeFromArray,
    getClinicalProfile,
    getCompleteness,
  };
};

-- Add clinical data fields to profiles table for comprehensive health assessment
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS blood_pressure_systolic integer,
ADD COLUMN IF NOT EXISTS blood_pressure_diastolic integer,
ADD COLUMN IF NOT EXISTS cholesterol_total numeric,
ADD COLUMN IF NOT EXISTS cholesterol_hdl numeric,
ADD COLUMN IF NOT EXISTS cholesterol_ldl numeric,
ADD COLUMN IF NOT EXISTS fasting_blood_sugar numeric,
ADD COLUMN IF NOT EXISTS smoking_status text CHECK (smoking_status IN ('never', 'former', 'current')),
ADD COLUMN IF NOT EXISTS exercise_frequency text CHECK (exercise_frequency IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
ADD COLUMN IF NOT EXISTS family_heart_disease boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS diabetes_status text CHECK (diabetes_status IN ('none', 'prediabetic', 'type1', 'type2')),
ADD COLUMN IF NOT EXISTS medications text[];

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.blood_pressure_systolic IS 'Systolic blood pressure in mmHg';
COMMENT ON COLUMN public.profiles.blood_pressure_diastolic IS 'Diastolic blood pressure in mmHg';
COMMENT ON COLUMN public.profiles.cholesterol_total IS 'Total cholesterol in mg/dL';
COMMENT ON COLUMN public.profiles.cholesterol_hdl IS 'HDL cholesterol in mg/dL';
COMMENT ON COLUMN public.profiles.cholesterol_ldl IS 'LDL cholesterol in mg/dL';
COMMENT ON COLUMN public.profiles.fasting_blood_sugar IS 'Fasting blood sugar in mg/dL';
COMMENT ON COLUMN public.profiles.smoking_status IS 'Smoking history: never, former, current';
COMMENT ON COLUMN public.profiles.exercise_frequency IS 'Exercise frequency level';
COMMENT ON COLUMN public.profiles.family_heart_disease IS 'Family history of heart disease';
COMMENT ON COLUMN public.profiles.diabetes_status IS 'Diabetes diagnosis status';
COMMENT ON COLUMN public.profiles.medications IS 'List of current medications';

-- Enable realtime for ecg_sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.ecg_sessions;
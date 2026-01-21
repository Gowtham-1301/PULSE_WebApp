-- Create profiles table for user health data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  age INTEGER,
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  bmi DECIMAL(5,2),
  health_conditions TEXT[],
  allergies TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ECG sessions table
CREATE TABLE public.ecg_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_name TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  heart_rate_avg DECIMAL(5,2),
  heart_rate_min DECIMAL(5,2),
  heart_rate_max DECIMAL(5,2),
  rr_interval_avg DECIMAL(8,4),
  qrs_duration_avg DECIMAL(8,4),
  qt_interval_avg DECIMAL(8,4),
  hrv_sdnn DECIMAL(8,4),
  hrv_rmssd DECIMAL(8,4),
  classification TEXT,
  confidence_score DECIMAL(5,2),
  risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high')),
  suggestions TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create risk logs table
CREATE TABLE public.risk_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ecg_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high')),
  model_confidence DECIMAL(5,2),
  rr_variability DECIMAL(8,4),
  abnormal_qrs_deviation BOOLEAN DEFAULT false,
  rhythmic_abnormality_duration INTEGER,
  rule_triggered TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecg_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- ECG sessions policies
CREATE POLICY "Users can view their own sessions" ON public.ecg_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sessions" ON public.ecg_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.ecg_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON public.ecg_sessions FOR DELETE USING (auth.uid() = user_id);

-- Risk logs policies
CREATE POLICY "Users can view their own risk logs" ON public.risk_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own risk logs" ON public.risk_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
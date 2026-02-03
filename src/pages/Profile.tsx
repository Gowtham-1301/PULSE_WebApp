import { useState } from 'react';
import { 
  User, Heart, Activity, Scale, Ruler, Calendar, AlertCircle, Save, Loader2,
  Stethoscope, Cigarette, Dumbbell, Users, Pill, Droplets, Beaker
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/layout/Header';
import { useProfile } from '@/hooks/useProfile';

interface ProfileProps {
  onNavigate: (page: string) => void;
}

const COMMON_CONDITIONS = [
  'Hypertension',
  'Diabetes',
  'Heart Disease',
  'Arrhythmia',
  'Anxiety',
  'Asthma',
  'Sleep Apnea',
  'Thyroid Disorder',
];

const COMMON_MEDICATIONS = [
  'Aspirin',
  'Beta Blockers',
  'ACE Inhibitors',
  'Statins',
  'Metformin',
  'Blood Thinners',
];

const Profile = ({ onNavigate }: ProfileProps) => {
  const {
    profile,
    isLoading,
    isSaving,
    saveProfile,
    updateField,
    addToArray,
    removeFromArray,
    getCompleteness,
  } = useProfile();

  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');

  const completeness = getCompleteness();

  const getBMICategory = (bmi: number | null) => {
    if (!bmi) return { label: 'Unknown', color: 'text-muted-foreground' };
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-risk-moderate' };
    if (bmi < 25) return { label: 'Normal', color: 'text-risk-low' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-risk-moderate' };
    return { label: 'Obese', color: 'text-risk-high' };
  };

  const getBPCategory = (systolic: number | null, diastolic: number | null) => {
    if (!systolic || !diastolic) return { label: 'Not recorded', color: 'text-muted-foreground' };
    if (systolic >= 180 || diastolic >= 120) return { label: 'Hypertensive Crisis', color: 'text-risk-high' };
    if (systolic >= 140 || diastolic >= 90) return { label: 'Stage 2 Hypertension', color: 'text-risk-high' };
    if (systolic >= 130 || diastolic >= 80) return { label: 'Stage 1 Hypertension', color: 'text-risk-moderate' };
    if (systolic >= 120) return { label: 'Elevated', color: 'text-risk-moderate' };
    return { label: 'Normal', color: 'text-risk-low' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-cyber flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-cyber">
      <Header onNavigate={onNavigate} currentPage="profile" />

      <main className="container py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold flex items-center gap-3">
                <User className="w-7 h-7 text-primary" />
                Health Profile
              </h2>
              <p className="text-muted-foreground mt-1">
                Complete your profile for personalized risk assessment
              </p>
            </div>
            <Button
              onClick={saveProfile}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 glow-primary"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Profile
            </Button>
          </div>

          {/* Profile Completeness */}
          <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Profile Completeness</span>
              <span className="text-sm text-primary font-bold">{completeness.overall}%</span>
            </div>
            <Progress value={completeness.overall} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Basic Info: {completeness.basic}%</span>
              <span>Clinical Data: {completeness.clinical}%</span>
            </div>
          </div>

          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-card/50">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="clinical">Clinical Data</TabsTrigger>
              <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Personal Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.full_name || ''}
                        onChange={(e) => updateField('full_name', e.target.value)}
                        placeholder="Enter your full name"
                        className="mt-1 bg-background/50"
                      />
                    </div>

                    <div>
                      <Label htmlFor="age" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Age
                      </Label>
                      <Input
                        id="age"
                        type="number"
                        value={profile.age || ''}
                        onChange={(e) => updateField('age', parseInt(e.target.value) || null)}
                        placeholder="Enter your age"
                        className="mt-1 bg-background/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-primary" />
                    Body Measurements
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="weight" className="flex items-center gap-2">
                          <Scale className="w-4 h-4" />
                          Weight (kg)
                        </Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          value={profile.weight || ''}
                          onChange={(e) => updateField('weight', parseFloat(e.target.value) || null)}
                          placeholder="kg"
                          className="mt-1 bg-background/50"
                        />
                      </div>

                      <div>
                        <Label htmlFor="height" className="flex items-center gap-2">
                          <Ruler className="w-4 h-4" />
                          Height (cm)
                        </Label>
                        <Input
                          id="height"
                          type="number"
                          value={profile.height || ''}
                          onChange={(e) => updateField('height', parseFloat(e.target.value) || null)}
                          placeholder="cm"
                          className="mt-1 bg-background/50"
                        />
                      </div>
                    </div>

                    {/* BMI Display */}
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Calculated BMI</span>
                        <div className="text-right">
                          <span className="text-xl font-display font-bold">
                            {profile.bmi?.toFixed(1) || '--'}
                          </span>
                          <span className={`text-sm ml-2 ${getBMICategory(profile.bmi).color}`}>
                            ({getBMICategory(profile.bmi).label})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Clinical Data Tab */}
            <TabsContent value="clinical" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Blood Pressure */}
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    Blood Pressure
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bp-systolic">Systolic (mmHg)</Label>
                        <Input
                          id="bp-systolic"
                          type="number"
                          value={profile.blood_pressure_systolic || ''}
                          onChange={(e) => updateField('blood_pressure_systolic', parseInt(e.target.value) || null)}
                          placeholder="120"
                          className="mt-1 bg-background/50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bp-diastolic">Diastolic (mmHg)</Label>
                        <Input
                          id="bp-diastolic"
                          type="number"
                          value={profile.blood_pressure_diastolic || ''}
                          onChange={(e) => updateField('blood_pressure_diastolic', parseInt(e.target.value) || null)}
                          placeholder="80"
                          className="mt-1 bg-background/50"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/30">
                      <span className={`text-sm font-medium ${getBPCategory(profile.blood_pressure_systolic, profile.blood_pressure_diastolic).color}`}>
                        {getBPCategory(profile.blood_pressure_systolic, profile.blood_pressure_diastolic).label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Blood Sugar */}
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-primary" />
                    Blood Sugar
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="blood-sugar">Fasting Blood Sugar (mg/dL)</Label>
                      <Input
                        id="blood-sugar"
                        type="number"
                        value={profile.fasting_blood_sugar || ''}
                        onChange={(e) => updateField('fasting_blood_sugar', parseFloat(e.target.value) || null)}
                        placeholder="100"
                        className="mt-1 bg-background/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Normal: &lt;100 | Prediabetes: 100-125 | Diabetes: ≥126
                      </p>
                    </div>

                    <div>
                      <Label>Diabetes Status</Label>
                      <Select
                        value={profile.diabetes_status || ''}
                        onValueChange={(value) => updateField('diabetes_status', value as typeof profile.diabetes_status)}
                      >
                        <SelectTrigger className="mt-1 bg-background/50">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="prediabetic">Prediabetic</SelectItem>
                          <SelectItem value="type1">Type 1 Diabetes</SelectItem>
                          <SelectItem value="type2">Type 2 Diabetes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Cholesterol */}
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 lg:col-span-2">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <Beaker className="w-5 h-5 text-primary" />
                    Cholesterol Panel
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="cholesterol-total">Total Cholesterol (mg/dL)</Label>
                      <Input
                        id="cholesterol-total"
                        type="number"
                        value={profile.cholesterol_total || ''}
                        onChange={(e) => updateField('cholesterol_total', parseFloat(e.target.value) || null)}
                        placeholder="200"
                        className="mt-1 bg-background/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Desirable: &lt;200</p>
                    </div>
                    <div>
                      <Label htmlFor="cholesterol-hdl">HDL "Good" (mg/dL)</Label>
                      <Input
                        id="cholesterol-hdl"
                        type="number"
                        value={profile.cholesterol_hdl || ''}
                        onChange={(e) => updateField('cholesterol_hdl', parseFloat(e.target.value) || null)}
                        placeholder="60"
                        className="mt-1 bg-background/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Optimal: ≥60</p>
                    </div>
                    <div>
                      <Label htmlFor="cholesterol-ldl">LDL "Bad" (mg/dL)</Label>
                      <Input
                        id="cholesterol-ldl"
                        type="number"
                        value={profile.cholesterol_ldl || ''}
                        onChange={(e) => updateField('cholesterol_ldl', parseFloat(e.target.value) || null)}
                        placeholder="100"
                        className="mt-1 bg-background/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Optimal: &lt;100</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Lifestyle Tab */}
            <TabsContent value="lifestyle" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Smoking Status */}
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <Cigarette className="w-5 h-5 text-primary" />
                    Smoking Status
                  </h3>
                  
                  <Select
                    value={profile.smoking_status || ''}
                    onValueChange={(value) => updateField('smoking_status', value as typeof profile.smoking_status)}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select smoking status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never Smoked</SelectItem>
                      <SelectItem value="former">Former Smoker</SelectItem>
                      <SelectItem value="current">Current Smoker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Exercise Frequency */}
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-primary" />
                    Exercise Frequency
                  </h3>
                  
                  <Select
                    value={profile.exercise_frequency || ''}
                    onValueChange={(value) => updateField('exercise_frequency', value as typeof profile.exercise_frequency)}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select exercise level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (Little to no exercise)</SelectItem>
                      <SelectItem value="light">Light (1-2 days/week)</SelectItem>
                      <SelectItem value="moderate">Moderate (3-4 days/week)</SelectItem>
                      <SelectItem value="active">Active (5-6 days/week)</SelectItem>
                      <SelectItem value="very_active">Very Active (Daily intense exercise)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Family History */}
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Family History
                  </h3>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div>
                      <Label htmlFor="family-history" className="text-base">Family Heart Disease</Label>
                      <p className="text-xs text-muted-foreground">
                        Parent or sibling with heart disease before age 55 (male) or 65 (female)
                      </p>
                    </div>
                    <Switch
                      id="family-history"
                      checked={profile.family_heart_disease}
                      onCheckedChange={(checked) => updateField('family_heart_disease', checked)}
                    />
                  </div>
                </div>

                {/* Medications */}
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-primary" />
                    Current Medications
                  </h3>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.medications?.map((med) => (
                      <Badge
                        key={med}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => removeFromArray('medications', med)}
                      >
                        {med} ×
                      </Badge>
                    ))}
                    {(!profile.medications || profile.medications.length === 0) && (
                      <p className="text-sm text-muted-foreground">No medications added</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {COMMON_MEDICATIONS.filter(m => !profile.medications?.includes(m)).map((med) => (
                      <Badge
                        key={med}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/20"
                        onClick={() => addToArray('medications', med)}
                      >
                        + {med}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newMedication}
                      onChange={(e) => setNewMedication(e.target.value)}
                      placeholder="Add custom medication"
                      className="bg-background/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addToArray('medications', newMedication);
                          setNewMedication('');
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        addToArray('medications', newMedication);
                        setNewMedication('');
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Conditions Tab */}
            <TabsContent value="conditions" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Health Conditions */}
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary" />
                    Health Conditions
                  </h3>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.health_conditions?.map((condition) => (
                      <Badge
                        key={condition}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => removeFromArray('health_conditions', condition)}
                      >
                        {condition} ×
                      </Badge>
                    ))}
                    {(!profile.health_conditions || profile.health_conditions.length === 0) && (
                      <p className="text-sm text-muted-foreground">No conditions added</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {COMMON_CONDITIONS.filter(c => !profile.health_conditions?.includes(c)).map((condition) => (
                      <Badge
                        key={condition}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/20"
                        onClick={() => addToArray('health_conditions', condition)}
                      >
                        + {condition}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                      placeholder="Add custom condition"
                      className="bg-background/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addToArray('health_conditions', newCondition);
                          setNewCondition('');
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        addToArray('health_conditions', newCondition);
                        setNewCondition('');
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Allergies */}
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-risk-moderate" />
                    Allergies
                  </h3>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.allergies?.map((allergy) => (
                      <Badge
                        key={allergy}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20 bg-risk-moderate/20 text-risk-moderate"
                        onClick={() => removeFromArray('allergies', allergy)}
                      >
                        {allergy} ×
                      </Badge>
                    ))}
                    {(!profile.allergies || profile.allergies.length === 0) && (
                      <p className="text-sm text-muted-foreground">No allergies added</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newAllergy}
                      onChange={(e) => setNewAllergy(e.target.value)}
                      placeholder="Add allergy (e.g., Penicillin)"
                      className="bg-background/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addToArray('allergies', newAllergy);
                          setNewAllergy('');
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        addToArray('allergies', newAllergy);
                        setNewAllergy('');
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Health Stats Summary */}
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 lg:col-span-2">
                  <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Risk Factor Summary
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-muted/30 text-center">
                      <span className="text-2xl font-display font-bold text-primary">
                        {profile.bmi?.toFixed(1) || '--'}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">BMI</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 text-center">
                      <span className="text-2xl font-display font-bold">
                        {profile.blood_pressure_systolic && profile.blood_pressure_diastolic
                          ? `${profile.blood_pressure_systolic}/${profile.blood_pressure_diastolic}`
                          : '--'}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">Blood Pressure</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 text-center">
                      <span className="text-2xl font-display font-bold">
                        {profile.cholesterol_total || '--'}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">Total Cholesterol</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 text-center">
                      <span className="text-2xl font-display font-bold">
                        {profile.fasting_blood_sugar || '--'}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">Fasting Glucose</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Data Privacy Notice */}
          <div className="mt-6 p-4 rounded-xl border border-risk-moderate/30 bg-risk-moderate/5">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-risk-moderate">Privacy Notice:</span> Your health 
              information is stored securely and used only to personalize your ECG analysis and 
              risk assessment. This data is never shared with third parties.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;

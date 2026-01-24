import { useState, useEffect } from 'react';
import { User, Heart, Activity, Scale, Ruler, Calendar, AlertCircle, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileProps {
  onNavigate: (page: string) => void;
}

interface ProfileData {
  full_name: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  health_conditions: string[] | null;
  allergies: string[] | null;
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

const Profile = ({ onNavigate }: ProfileProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    age: null,
    weight: null,
    height: null,
    bmi: null,
    health_conditions: [],
    allergies: [],
  });
  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setProfile({
            full_name: data.full_name,
            age: data.age,
            weight: data.weight,
            height: data.height,
            bmi: data.bmi,
            health_conditions: data.health_conditions || [],
            allergies: data.allergies || [],
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

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.full_name,
          age: profile.age,
          weight: profile.weight,
          height: profile.height,
          bmi: profile.bmi,
          health_conditions: profile.health_conditions,
          allergies: profile.allergies,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Profile Saved',
        description: 'Your health profile has been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addCondition = (condition: string) => {
    if (condition && !profile.health_conditions?.includes(condition)) {
      setProfile(prev => ({
        ...prev,
        health_conditions: [...(prev.health_conditions || []), condition],
      }));
      setNewCondition('');
    }
  };

  const removeCondition = (condition: string) => {
    setProfile(prev => ({
      ...prev,
      health_conditions: prev.health_conditions?.filter(c => c !== condition) || [],
    }));
  };

  const addAllergy = (allergy: string) => {
    if (allergy && !profile.allergies?.includes(allergy)) {
      setProfile(prev => ({
        ...prev,
        allergies: [...(prev.allergies || []), allergy],
      }));
      setNewAllergy('');
    }
  };

  const removeAllergy = (allergy: string) => {
    setProfile(prev => ({
      ...prev,
      allergies: prev.allergies?.filter(a => a !== allergy) || [],
    }));
  };

  const getBMICategory = (bmi: number | null) => {
    if (!bmi) return { label: 'Unknown', color: 'text-muted-foreground' };
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-risk-moderate' };
    if (bmi < 25) return { label: 'Normal', color: 'text-risk-low' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-risk-moderate' };
    return { label: 'Obese', color: 'text-risk-high' };
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold flex items-center gap-3">
                <User className="w-7 h-7 text-primary" />
                Health Profile
              </h2>
              <p className="text-muted-foreground mt-1">
                Manage your personal health information for personalized insights
              </p>
            </div>
            <Button
              onClick={handleSave}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Basic Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.full_name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
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
                    onChange={(e) => setProfile(prev => ({ ...prev, age: parseInt(e.target.value) || null }))}
                    placeholder="Enter your age"
                    className="mt-1 bg-background/50"
                  />
                </div>

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
                      onChange={(e) => setProfile(prev => ({ ...prev, weight: parseFloat(e.target.value) || null }))}
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
                      onChange={(e) => setProfile(prev => ({ ...prev, height: parseFloat(e.target.value) || null }))}
                      placeholder="cm"
                      className="mt-1 bg-background/50"
                    />
                  </div>
                </div>

                {/* BMI Display */}
                <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/30">
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

            {/* Health Conditions */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Health Conditions
              </h3>

              {/* Current conditions */}
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.health_conditions?.map((condition) => (
                  <Badge
                    key={condition}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={() => removeCondition(condition)}
                  >
                    {condition} ×
                  </Badge>
                ))}
                {(!profile.health_conditions || profile.health_conditions.length === 0) && (
                  <p className="text-sm text-muted-foreground">No conditions added</p>
                )}
              </div>

              {/* Quick add */}
              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_CONDITIONS.filter(c => !profile.health_conditions?.includes(c)).map((condition) => (
                  <Badge
                    key={condition}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() => addCondition(condition)}
                  >
                    + {condition}
                  </Badge>
                ))}
              </div>

              {/* Custom condition */}
              <div className="flex gap-2">
                <Input
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="Add custom condition"
                  className="bg-background/50"
                  onKeyDown={(e) => e.key === 'Enter' && addCondition(newCondition)}
                />
                <Button
                  variant="outline"
                  onClick={() => addCondition(newCondition)}
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

              {/* Current allergies */}
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.allergies?.map((allergy) => (
                  <Badge
                    key={allergy}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20 bg-risk-moderate/20 text-risk-moderate"
                    onClick={() => removeAllergy(allergy)}
                  >
                    {allergy} ×
                  </Badge>
                ))}
                {(!profile.allergies || profile.allergies.length === 0) && (
                  <p className="text-sm text-muted-foreground">No allergies added</p>
                )}
              </div>

              {/* Add allergy */}
              <div className="flex gap-2">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Add allergy (e.g., Penicillin)"
                  className="bg-background/50"
                  onKeyDown={(e) => e.key === 'Enter' && addAllergy(newAllergy)}
                />
                <Button
                  variant="outline"
                  onClick={() => addAllergy(newAllergy)}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Health Stats Summary */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
              <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Health Stats Summary
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">Total ECG Sessions</span>
                  <span className="font-display font-bold text-primary">--</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">Average Heart Rate</span>
                  <span className="font-display font-bold">-- BPM</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">Most Common Classification</span>
                  <span className="font-display font-bold text-risk-low">Normal</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">Profile Completeness</span>
                  <span className="font-display font-bold text-accent">
                    {Math.round(
                      ([profile.full_name, profile.age, profile.weight, profile.height].filter(Boolean).length / 4) * 100
                    )}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Privacy Notice */}
          <div className="mt-6 p-4 rounded-xl border border-risk-moderate/30 bg-risk-moderate/5">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-risk-moderate">Privacy Notice:</span> Your health 
              information is stored securely and used only to personalize your ECG analysis and 
              health insights. This data is never shared with third parties.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;

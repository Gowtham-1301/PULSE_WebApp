import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

interface RiskFusionRequest {
  ecgMetrics: ECGMetrics;
  ecgClassification: ECGClassification;
  clinicalProfile: ClinicalProfile;
  isLiveMonitoring?: boolean;
}

interface RiskFusionResponse {
  finalRiskLevel: 'low' | 'moderate' | 'high';
  ecgRiskScore: number;
  clinicalRiskScore: number;
  fusedRiskScore: number;
  riskFactors: string[];
  protectiveFactors: string[];
  confidence: number;
  recommendations: string[];
}

// Calculate ECG-based risk score (0-100)
function calculateECGRisk(metrics: ECGMetrics, classification: ECGClassification): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // Heart rate assessment
  if (metrics.heartRate < 50) {
    score += 25;
    factors.push('Bradycardia detected (HR < 50 BPM)');
  } else if (metrics.heartRate > 100) {
    score += 20;
    factors.push('Tachycardia detected (HR > 100 BPM)');
  } else if (metrics.heartRate > 120) {
    score += 35;
    factors.push('Significant tachycardia (HR > 120 BPM)');
  }

  // HRV assessment (low HRV = higher risk)
  if (metrics.hrvSdnn < 20) {
    score += 20;
    factors.push('Very low heart rate variability');
  } else if (metrics.hrvSdnn < 50) {
    score += 10;
    factors.push('Reduced heart rate variability');
  }

  // QRS duration
  if (metrics.qrsDuration > 0.12) {
    score += 15;
    factors.push('Prolonged QRS duration');
  }

  // QT interval (corrected for HR)
  const qtc = metrics.qtInterval / Math.sqrt(metrics.rrInterval);
  if (qtc > 0.45) {
    score += 20;
    factors.push('Prolonged QTc interval');
  }

  // Classification-based risk
  const abnormalPatterns = ['Atrial Fibrillation', 'Ventricular Tachycardia', 'AV Block', 'ST Elevation'];
  if (abnormalPatterns.some(p => classification.label.toLowerCase().includes(p.toLowerCase()))) {
    score += 30 * (classification.confidence / 100);
    factors.push(`AI detected: ${classification.label}`);
  }

  // Confidence adjustment
  if (classification.confidence < 70) {
    score *= 0.8; // Reduce score if AI confidence is low
  }

  return { score: Math.min(score, 100), factors };
}

// Calculate clinical risk score using Framingham-like factors (0-100)
function calculateClinicalRisk(profile: ClinicalProfile): { score: number; factors: string[]; protective: string[] } {
  let score = 0;
  const factors: string[] = [];
  const protective: string[] = [];

  // Age factor
  if (profile.age) {
    if (profile.age >= 65) {
      score += 20;
      factors.push('Age ≥ 65 years');
    } else if (profile.age >= 55) {
      score += 15;
      factors.push('Age 55-64 years');
    } else if (profile.age >= 45) {
      score += 10;
      factors.push('Age 45-54 years');
    }
  }

  // BMI factor
  if (profile.bmi) {
    if (profile.bmi >= 35) {
      score += 15;
      factors.push('Severe obesity (BMI ≥ 35)');
    } else if (profile.bmi >= 30) {
      score += 10;
      factors.push('Obesity (BMI 30-35)');
    } else if (profile.bmi >= 25) {
      score += 5;
      factors.push('Overweight (BMI 25-30)');
    } else if (profile.bmi >= 18.5 && profile.bmi < 25) {
      protective.push('Healthy BMI');
    }
  }

  // Blood pressure
  if (profile.bloodPressureSystolic) {
    if (profile.bloodPressureSystolic >= 180) {
      score += 25;
      factors.push('Hypertensive crisis (SBP ≥ 180)');
    } else if (profile.bloodPressureSystolic >= 140) {
      score += 15;
      factors.push('Stage 2 hypertension');
    } else if (profile.bloodPressureSystolic >= 130) {
      score += 10;
      factors.push('Stage 1 hypertension');
    } else if (profile.bloodPressureSystolic < 120) {
      protective.push('Normal blood pressure');
    }
  }

  // Cholesterol
  if (profile.cholesterolTotal) {
    if (profile.cholesterolTotal >= 240) {
      score += 15;
      factors.push('High total cholesterol');
    } else if (profile.cholesterolTotal >= 200) {
      score += 8;
      factors.push('Borderline high cholesterol');
    }
  }

  if (profile.cholesterolHdl) {
    if (profile.cholesterolHdl < 40) {
      score += 10;
      factors.push('Low HDL cholesterol');
    } else if (profile.cholesterolHdl >= 60) {
      score -= 5;
      protective.push('High HDL cholesterol');
    }
  }

  // Blood sugar
  if (profile.fastingBloodSugar) {
    if (profile.fastingBloodSugar >= 126) {
      score += 15;
      factors.push('Diabetic fasting glucose');
    } else if (profile.fastingBloodSugar >= 100) {
      score += 8;
      factors.push('Prediabetic fasting glucose');
    }
  }

  // Diabetes status
  if (profile.diabetesStatus === 'type1' || profile.diabetesStatus === 'type2') {
    score += 15;
    factors.push('Diabetes diagnosis');
  } else if (profile.diabetesStatus === 'prediabetic') {
    score += 8;
    factors.push('Prediabetes');
  }

  // Smoking
  if (profile.smokingStatus === 'current') {
    score += 20;
    factors.push('Current smoker');
  } else if (profile.smokingStatus === 'former') {
    score += 5;
    factors.push('Former smoker');
  } else if (profile.smokingStatus === 'never') {
    protective.push('Never smoked');
  }

  // Exercise
  if (profile.exerciseFrequency === 'sedentary') {
    score += 10;
    factors.push('Sedentary lifestyle');
  } else if (profile.exerciseFrequency === 'active' || profile.exerciseFrequency === 'very_active') {
    score -= 10;
    protective.push('Active lifestyle');
  }

  // Family history
  if (profile.familyHeartDisease) {
    score += 15;
    factors.push('Family history of heart disease');
  }

  // Existing conditions
  if (profile.healthConditions) {
    if (profile.healthConditions.some(c => c.toLowerCase().includes('hypertension'))) {
      score += 10;
    }
    if (profile.healthConditions.some(c => c.toLowerCase().includes('arrhythmia'))) {
      score += 15;
    }
  }

  return { score: Math.max(0, Math.min(score, 100)), factors, protective };
}

// Fuse ECG and clinical risks with dynamic weighting
function fuseRisks(
  ecgRisk: number, 
  clinicalRisk: number, 
  isLiveMonitoring: boolean,
  ecgConfidence: number
): { fusedScore: number; alpha: number; beta: number } {
  // Base weights
  let alpha = 0.6; // ECG weight
  let beta = 0.4;  // Clinical weight

  // Adjust for live monitoring (prioritize ECG data)
  if (isLiveMonitoring) {
    alpha = 0.7;
    beta = 0.3;
  }

  // Adjust for low ECG confidence
  if (ecgConfidence < 70) {
    alpha = 0.4;
    beta = 0.6;
  }

  // If either risk is very high, don't let the other dampen it too much
  if (ecgRisk > 70 || clinicalRisk > 70) {
    const maxRisk = Math.max(ecgRisk, clinicalRisk);
    const fusedScore = alpha * ecgRisk + beta * clinicalRisk;
    return { fusedScore: Math.max(fusedScore, maxRisk * 0.8), alpha, beta };
  }

  const fusedScore = alpha * ecgRisk + beta * clinicalRisk;
  return { fusedScore, alpha, beta };
}

// Generate clinical recommendations
function generateRecommendations(
  riskLevel: 'low' | 'moderate' | 'high',
  factors: string[],
  profile: ClinicalProfile
): string[] {
  const recommendations: string[] = [];

  if (riskLevel === 'high') {
    recommendations.push('Consider consulting a cardiologist for comprehensive evaluation');
    recommendations.push('Continue monitoring and document any symptoms');
  }

  // Specific recommendations based on factors
  if (factors.some(f => f.includes('hypertension'))) {
    recommendations.push('Monitor blood pressure regularly and follow prescribed medication');
  }

  if (factors.some(f => f.includes('cholesterol'))) {
    recommendations.push('Consider dietary modifications to improve cholesterol levels');
  }

  if (factors.some(f => f.includes('sedentary'))) {
    recommendations.push('Aim for at least 150 minutes of moderate exercise per week');
  }

  if (factors.some(f => f.includes('smoker'))) {
    recommendations.push('Smoking cessation can significantly reduce cardiovascular risk');
  }

  if (factors.some(f => f.includes('BMI') || f.includes('obesity'))) {
    recommendations.push('Weight management through diet and exercise may improve heart health');
  }

  if (factors.some(f => f.includes('glucose') || f.includes('Diabet'))) {
    recommendations.push('Maintain blood sugar control through diet, exercise, and medication');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Maintain your healthy lifestyle habits');
    recommendations.push('Continue regular health check-ups');
  }

  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ecgMetrics, ecgClassification, clinicalProfile, isLiveMonitoring = false }: RiskFusionRequest = await req.json();

    // Calculate ECG risk
    const { score: ecgRiskScore, factors: ecgFactors } = calculateECGRisk(ecgMetrics, ecgClassification);

    // Calculate clinical risk
    const { score: clinicalRiskScore, factors: clinicalFactors, protective: protectiveFactors } = calculateClinicalRisk(clinicalProfile);

    // Fuse risks
    const { fusedScore, alpha, beta } = fuseRisks(
      ecgRiskScore, 
      clinicalRiskScore, 
      isLiveMonitoring,
      ecgClassification.confidence
    );

    // Determine risk level
    let finalRiskLevel: 'low' | 'moderate' | 'high';
    if (fusedScore >= 60) {
      finalRiskLevel = 'high';
    } else if (fusedScore >= 30) {
      finalRiskLevel = 'moderate';
    } else {
      finalRiskLevel = 'low';
    }

    // Combine all risk factors
    const allFactors = [...ecgFactors, ...clinicalFactors];

    // Generate recommendations
    const recommendations = generateRecommendations(finalRiskLevel, allFactors, clinicalProfile);

    // Calculate overall confidence
    const confidence = Math.round(
      (ecgClassification.confidence * alpha + 85 * beta) // Assume 85% confidence in clinical data
    );

    const response: RiskFusionResponse = {
      finalRiskLevel,
      ecgRiskScore: Math.round(ecgRiskScore),
      clinicalRiskScore: Math.round(clinicalRiskScore),
      fusedRiskScore: Math.round(fusedScore),
      riskFactors: allFactors,
      protectiveFactors,
      confidence,
      recommendations,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Risk fusion error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

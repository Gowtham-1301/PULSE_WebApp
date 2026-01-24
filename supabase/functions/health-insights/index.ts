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

interface UserProfile {
  age?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  healthConditions?: string[];
}

interface HealthInsightsRequest {
  metrics: ECGMetrics;
  classification: {
    label: string;
    confidence: number;
  };
  riskLevel: 'low' | 'moderate' | 'high';
  profile?: UserProfile;
  historicalAvgHR?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metrics, classification, riskLevel, profile, historicalAvgHR }: HealthInsightsRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a rich prompt with all context
    const systemPrompt = `You are a cardiac health advisor AI assistant. You analyze ECG data and provide personalized, non-clinical health insights and lifestyle suggestions. You MUST NOT diagnose conditions or prescribe treatments.

Your responses should be:
- Supportive and encouraging
- Focused on lifestyle improvements
- Personalized based on user profile if available
- Clear about being for educational purposes only

Always structure your response as JSON with these fields:
{
  "summary": "A brief 1-2 sentence summary of the cardiac status",
  "insights": ["Array of 3-5 personalized health insights"],
  "suggestions": ["Array of 3-5 actionable lifestyle suggestions"],
  "warnings": ["Array of any concerning patterns to watch (can be empty)"],
  "positives": ["Array of positive observations about the readings"]
}`;

    const userPrompt = `Analyze the following ECG session data and provide personalized health insights:

**Current Metrics:**
- Heart Rate: ${metrics.heartRate} BPM ${metrics.heartRateMin ? `(Range: ${metrics.heartRateMin}-${metrics.heartRateMax} BPM)` : ''}
- RR Interval: ${metrics.rrInterval.toFixed(3)} seconds
- QRS Duration: ${metrics.qrsDuration.toFixed(3)} seconds
- QT Interval: ${metrics.qtInterval.toFixed(3)} seconds
- Heart Rate Variability (SDNN): ${metrics.hrvSdnn.toFixed(1)} ms
- Heart Rate Variability (RMSSD): ${metrics.hrvRmssd.toFixed(1)} ms

**AI Classification:**
- Pattern: ${classification.label}
- Confidence: ${classification.confidence.toFixed(1)}%
- Risk Level: ${riskLevel.toUpperCase()}

${profile ? `**User Profile:**
- Age: ${profile.age || 'Not specified'}
- BMI: ${profile.bmi?.toFixed(1) || 'Not specified'}
- Health Conditions: ${profile.healthConditions?.join(', ') || 'None specified'}` : ''}

${historicalAvgHR ? `**Historical Context:**
- Average Heart Rate (past sessions): ${historicalAvgHR} BPM
- Current compared to average: ${metrics.heartRate > historicalAvgHR ? 'Higher' : metrics.heartRate < historicalAvgHR ? 'Lower' : 'Same'}` : ''}

Provide personalized health insights and lifestyle suggestions based on this data. Remember this is for educational purposes only.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI credits exhausted. Please add more credits." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    // Parse the JSON response from the AI
    let insights;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      insights = JSON.parse(jsonStr);
    } catch {
      // Fallback if AI doesn't return proper JSON
      insights = {
        summary: content.slice(0, 200),
        insights: [content],
        suggestions: [],
        warnings: [],
        positives: [],
      };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Health insights error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

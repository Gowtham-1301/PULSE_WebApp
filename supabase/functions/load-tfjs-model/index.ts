import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List user's model files in storage
    const { data: files, error: listError } = await supabase.storage
      .from("ml-models")
      .list(user.id, { limit: 50 });

    if (listError) {
      return new Response(
        JSON.stringify({ error: `Failed to list models: ${listError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const modelFiles = files || [];
    const jsonFiles = modelFiles.filter(f => f.name.endsWith("model.json") || f.name.endsWith(".json") && !f.name.includes("_meta"));
    const h5Files = modelFiles.filter(f => f.name.endsWith(".h5"));
    const binFiles = modelFiles.filter(f => f.name.endsWith(".bin"));

    // Generate signed URLs for TF.js model files
    const modelUrls: { name: string; url: string; type: string }[] = [];

    for (const file of [...jsonFiles, ...binFiles, ...h5Files]) {
      const { data: signedData } = await supabase.storage
        .from("ml-models")
        .createSignedUrl(`${user.id}/${file.name}`, 3600); // 1hr signed URL

      if (signedData?.signedUrl) {
        modelUrls.push({
          name: file.name,
          url: signedData.signedUrl,
          type: file.name.endsWith(".json") ? "json" :
                file.name.endsWith(".bin") ? "weights" : "h5",
        });
      }
    }

    const modelJsonUrl = modelUrls.find(f => f.type === "json")?.url;

    return new Response(
      JSON.stringify({
        success: true,
        modelJsonUrl,
        files: modelUrls,
        hasConvertedModel: !!modelJsonUrl,
        hasH5Model: h5Files.length > 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("load-tfjs-model error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

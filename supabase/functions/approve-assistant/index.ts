import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[approve-assistant] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();
    const { appId, email, password, full_name, phone } = body;

    console.log(`[approve-assistant] Processing approval request for appId: ${appId}, email: ${email}`);

    if (!appId || !email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "E-posta, şifre ve başvuru ID gereklidir.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // 1. auth.admin.createUser
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || "",
        phone: phone || "",
        role: "assistant",
      },
    });

    if (authError || !authData?.user) {
      console.error("[approve-assistant] auth.admin.createUser failed:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: authError?.message || "Authentication kullanıcısı oluşturulamadı.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const userId = authData.user.id;
    console.log(`[approve-assistant] Auth user created with ID: ${userId}`);

    // 2. profiles upsert
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: full_name || "",
        phone: phone || "",
        role: "assistant",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("[approve-assistant] profiles upsert failed:", profileError);
    }

    // 3. assistants table update
    const { error: assistantError } = await adminClient
      .from("assistants")
      .update({
        user_id: userId,
        status: "aktif",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appId);

    if (assistantError) {
      console.error("[approve-assistant] assistants update failed:", assistantError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Kullanıcı oluşturuldu fakat assistants tablosu güncellenemedi: ${assistantError.message}`,
          user_id: userId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log(`[approve-assistant] Assistant ${appId} successfully approved.`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        message: "Kurye hesabı başarıyla oluşturuldu.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("[approve-assistant] Error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Edge Function çalıştırılırken bir hata oluştu.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

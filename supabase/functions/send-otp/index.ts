import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  email: string;
  name?: string;
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP Email Template (inline to avoid import issues)
function otpEmailTemplate(code: string, name?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="padding: 24px 16px; background-color: #0a0a0a;">
    <div style="background: linear-gradient(180deg, #141414 0%, #0f0f0f 100%); border: 1px solid rgba(212, 175, 55, 0.15); border-radius: 16px; max-width: 480px; margin: 0 auto; overflow: hidden;">
      <div style="text-align: center; padding: 28px 16px 20px; border-bottom: 1px solid rgba(212, 175, 55, 0.1);">
        <p style="color: #d4af37; font-size: 11px; font-weight: 600; letter-spacing: 4px; margin: 0; text-transform: uppercase;">♠ Home Hold'em Club ♠</p>
      </div>
      <div style="padding: 40px 28px; text-align: center;">
        <div style="font-size: 48px; line-height: 1; margin-bottom: 20px;">🔐</div>
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 12px; line-height: 1.3;">Verify your email</h1>
        <p style="color: #888888; font-size: 15px; line-height: 1.5; margin: 0 0 28px;">
          ${name ? `Hey ${name}, enter` : 'Enter'} this code to complete your signup
        </p>
        <div style="background: #1a1a1a; border: 2px solid #d4af37; border-radius: 12px; padding: 24px 20px; margin: 0 auto 24px; max-width: 220px;">
          <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #d4af37; font-family: 'SF Mono', Monaco, 'Courier New', monospace; margin: 0;">${code}</p>
        </div>
        <p style="color: #666666; font-size: 12px; margin: 0;">
          This code expires in 10 minutes
        </p>
      </div>
      <div style="text-align: center; padding: 20px 24px; border-top: 1px solid rgba(212, 175, 55, 0.1);">
        <p style="color: #4a4a4a; font-size: 11px; margin: 0; letter-spacing: 1px;">Home Hold'em Club</p>
        <p style="color: #3a3a3a; font-size: 14px; letter-spacing: 8px; margin-top: 8px;">♥ ♠ ♦ ♣</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: SendOTPRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Rate limiting: Check for recent OTP requests (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("email_verifications")
      .select("*", { count: "exact", head: true })
      .eq("email", email.toLowerCase())
      .gte("created_at", oneHourAgo);

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many verification attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store OTP in database
    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Home Hold'em Club <noreply@hello.homeholdem.com>",
      to: [email],
      subject: `Your verification code: ${code}`,
      html: otpEmailTemplate(code, name),
    });

    console.log("OTP email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

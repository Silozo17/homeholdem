import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const SendOTPSchema = z.object({
  email: z.string().email().max(255).transform(val => val.toLowerCase()),
  name: z.string().max(100).optional(),
});

// HTML escape function to prevent XSS
function escapeHtml(str: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (c) => htmlEscapeMap[c] || c);
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Premium SVG lock icon
const lockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

// Premium spade icon for header
const spadeIcon = `<span style="color: #d4af37; margin: 0 4px;">♠</span>`;

// Footer suits row
const footerSuits = `<div style="color: #3d5e52; font-size: 14px; letter-spacing: 8px; margin-top: 8px; text-shadow: 0 0 10px rgba(212, 175, 55, 0.2);"><span style="color: #ef4444;">♥</span> <span style="color: #d4af37;">♠</span> <span style="color: #ef4444;">♦</span> <span style="color: #d4af37;">♣</span></div>`;

// Premium OTP Email Template with casino green theme and premium SVG icons
function otpEmailTemplate(code: string, name?: string): string {
  const safeName = name ? escapeHtml(name) : undefined;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <style>
    :root { color-scheme: dark; supported-color-schemes: dark; }
    body { background-color: #0f1f1a !important; }
  </style>
  <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;" bgcolor="#0f1f1a">
  <div style="padding: 24px 16px; background-color: #0f1f1a;">
    <div style="background: linear-gradient(180deg, #172a24 0%, #0d1916 100%); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 16px; max-width: 480px; margin: 0 auto; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);">
      <div style="text-align: center; padding: 28px 16px 20px; border-bottom: 1px solid rgba(212, 175, 55, 0.2); background: linear-gradient(180deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 50%, transparent 100%);">
        <p style="color: #d4af37; font-size: 11px; font-weight: 600; letter-spacing: 4px; margin: 0; text-transform: uppercase; text-shadow: 0 0 20px rgba(212, 175, 55, 0.3);">${spadeIcon}Home Hold'em Club${spadeIcon}</p>
      </div>
      <div style="padding: 40px 28px; text-align: center;">
        <div style="margin-bottom: 20px; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));">${lockIcon}</div>
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 12px; line-height: 1.3; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">Verify your email</h1>
        <p style="color: #8fb5a5; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
          ${safeName ? `Hey ${safeName}, enter` : 'Enter'} this code to complete your signup
        </p>
        <div style="background: linear-gradient(135deg, #1f3830 0%, #172a24 100%); border: 2px solid #d4af37; border-radius: 12px; padding: 24px 20px; margin: 0 auto 24px; max-width: 220px; box-shadow: 0 0 40px rgba(212, 175, 55, 0.2), 0 0 80px rgba(212, 175, 55, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08);">
          <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #d4af37; font-family: 'SF Mono', Monaco, 'Courier New', monospace; margin: 0; text-shadow: 0 0 20px rgba(212, 175, 55, 0.5);">${code}</p>
        </div>
        <p style="color: #6b9a8a; font-size: 12px; margin: 0;">
          This code expires in 10 minutes
        </p>
      </div>
      <div style="text-align: center; padding: 20px 24px; border-top: 1px solid rgba(212, 175, 55, 0.2); background: linear-gradient(0deg, rgba(212, 175, 55, 0.06) 0%, rgba(212, 175, 55, 0.02) 50%, transparent 100%);">
        <p style="color: #4a7566; font-size: 11px; margin: 0; letter-spacing: 1px;">Home Hold'em Club</p>
        ${footerSuits}
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
    // Parse and validate input
    const rawBody = await req.json();
    const parseResult = SendOTPSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: parseResult.error.flatten().fieldErrors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, name } = parseResult.data;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Rate limiting: Check for recent OTP requests (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("email_verifications")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
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
        email,
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

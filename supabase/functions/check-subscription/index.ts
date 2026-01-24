import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // First, check local subscriptions table (for gifted/manual subscriptions)
    const { data: localSub, error: localSubError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (localSubError && localSubError.code !== "PGRST116") {
      logStep("Error checking local subscription", { error: localSubError.message });
    }

    if (localSub) {
      const now = new Date();
      const isTrialing = localSub.status === "trialing" && localSub.trial_ends_at && new Date(localSub.trial_ends_at) > now;
      const isActive = localSub.status === "active" && localSub.current_period_end && new Date(localSub.current_period_end) > now;
      
      if (isTrialing || isActive) {
        const response = {
          subscribed: true,
          status: localSub.status,
          plan: localSub.plan,
          trial_ends_at: localSub.trial_ends_at,
          current_period_end: localSub.current_period_end,
          stripe_customer_id: localSub.stripe_customer_id,
          stripe_subscription_id: localSub.stripe_subscription_id,
        };
        logStep("Active local subscription found", response);
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Fallback: Check Stripe for subscription
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("No Stripe key, returning unsubscribed");
      return new Response(JSON.stringify({ 
        subscribed: false,
        status: null,
        plan: null,
        trial_ends_at: null,
        current_period_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    logStep("Stripe key verified, checking Stripe");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        status: null,
        plan: null,
        trial_ends_at: null,
        current_period_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active or trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No Stripe subscription found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        status: null,
        plan: null,
        trial_ends_at: null,
        current_period_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const isActive = subscription.status === "active" || subscription.status === "trialing";
    
    // Determine plan based on price interval
    const priceInterval = subscription.items.data[0]?.price?.recurring?.interval;
    const plan = priceInterval === "year" ? "annual" : "monthly";
    
    const response = {
      subscribed: isActive,
      status: subscription.status,
      plan,
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
    };

    logStep("Stripe subscription found", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

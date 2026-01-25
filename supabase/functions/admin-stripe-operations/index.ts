import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-STRIPE] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminData, error: adminError } = await adminClient
      .from('app_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError || !adminData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const { action, userEmail, subscriptionId, chargeId, paymentIntentId, amount } = await req.json();

    logStep('Processing action', { action, userEmail });

    // Get Stripe customer by email
    const getCustomer = async (email: string) => {
      const customers = await stripe.customers.list({ email, limit: 1 });
      return customers.data.length > 0 ? customers.data[0] : null;
    };

    switch (action) {
      case 'get_payment_history': {
        if (!userEmail) {
          return new Response(
            JSON.stringify({ error: 'User email is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const customer = await getCustomer(userEmail);
        if (!customer) {
          return new Response(
            JSON.stringify({ charges: [], subscriptions: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        logStep('Found customer', { customerId: customer.id });

        // Get charges/payments
        const charges = await stripe.charges.list({
          customer: customer.id,
          limit: 20,
        });

        // Get subscriptions (all statuses)
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 10,
          status: 'all',
        });

        logStep('Retrieved payment data', { 
          chargeCount: charges.data.length, 
          subscriptionCount: subscriptions.data.length 
        });

        return new Response(
          JSON.stringify({
            charges: charges.data.map((c: Stripe.Charge) => ({
              id: c.id,
              amount: c.amount,
              currency: c.currency,
              status: c.status,
              refunded: c.refunded,
              amount_refunded: c.amount_refunded,
              created: c.created,
              description: c.description,
              payment_intent: c.payment_intent,
            })),
            subscriptions: subscriptions.data.map((s: Stripe.Subscription) => ({
              id: s.id,
              status: s.status,
              current_period_start: s.current_period_start,
              current_period_end: s.current_period_end,
              cancel_at_period_end: s.cancel_at_period_end,
              canceled_at: s.canceled_at,
              items: s.items.data.map((i: Stripe.SubscriptionItem) => ({
                id: i.id,
                price: {
                  id: i.price.id,
                  unit_amount: i.price.unit_amount,
                  currency: i.price.currency,
                  recurring: i.price.recurring,
                },
              })),
            })),
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancel_subscription': {
        if (!subscriptionId) {
          return new Response(
            JSON.stringify({ error: 'Subscription ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        logStep('Canceling subscription', { subscriptionId });

        const canceled = await stripe.subscriptions.cancel(subscriptionId);

        // Update local subscriptions table
        await adminClient
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscriptionId);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Subscription canceled',
            subscription: {
              id: canceled.id,
              status: canceled.status,
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_refund': {
        if (!chargeId && !paymentIntentId) {
          return new Response(
            JSON.stringify({ error: 'Charge ID or Payment Intent ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        logStep('Creating refund', { chargeId, paymentIntentId, amount });

        const refundParams: Stripe.RefundCreateParams = {
          reason: 'requested_by_customer',
        };

        if (chargeId) {
          refundParams.charge = chargeId;
        } else if (paymentIntentId) {
          refundParams.payment_intent = paymentIntentId;
        }

        if (amount) {
          refundParams.amount = amount; // Amount in cents
        }

        const refund = await stripe.refunds.create(refundParams);

        logStep('Refund created', { refundId: refund.id, amount: refund.amount });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Refund issued',
            refund: {
              id: refund.id,
              amount: refund.amount,
              currency: refund.currency,
              status: refund.status,
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in admin-stripe-operations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

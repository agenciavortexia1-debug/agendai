import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.1.1?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature')

    try {
        const body = await req.text()
        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
            undefined,
            cryptoProvider
        )

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                await supabaseAdmin
                    .from('businesses')
                    .update({
                        stripe_subscription_id: subscription.id,
                        subscription_status: subscription.status,
                        plan_type: 'pro', // Ou mapear baseado no Price ID
                    })
                    .eq('stripe_customer_id', subscription.customer as string)
                break
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                await supabaseAdmin
                    .from('businesses')
                    .update({
                        subscription_status: 'canceled',
                        plan_type: 'free',
                    })
                    .eq('stripe_customer_id', subscription.customer as string)
                break
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (err) {
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
})

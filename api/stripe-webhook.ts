import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { buffer } from 'micro';

export const config = {
    api: {
        bodyParser: false,
    },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature'] as string;

    try {
        const event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET || ''
        );

        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await supabaseAdmin
                    .from('businesses')
                    .update({
                        stripe_subscription_id: subscription.id,
                        subscription_status: subscription.status,
                        plan_type: 'pro',
                    })
                    .eq('stripe_customer_id', subscription.customer as string);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await supabaseAdmin
                    .from('businesses')
                    .update({
                        subscription_status: 'canceled',
                        plan_type: 'free',
                    })
                    .eq('stripe_customer_id', subscription.customer as string);
                break;
            }
        }

        return res.status(200).json({ received: true });
    } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
}

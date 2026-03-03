import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16', // Versão mais estável
});

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { token } = req.headers;
        if (!token) throw new Error('Auth token required');

        // Validar usuário no Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token as string);
        if (authError || !user) throw new Error('Não autorizado');

        // Buscar negócio
        const { data: business } = await supabase
            .from('businesses')
            .select('stripe_customer_id, name')
            .eq('user_id', user.id)
            .single();

        let customerId = business?.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: business?.name || user.email,
                metadata: { supabase_user_id: user.id }
            });
            customerId = customer.id;

            await supabase
                .from('businesses')
                .update({ stripe_customer_id: customerId })
                .eq('user_id', user.id);
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.headers.origin}/dashboard?success=true`,
            cancel_url: `${req.headers.origin}/dashboard?canceled=true`,
        });

        return res.status(200).json({ url: session.url });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
}

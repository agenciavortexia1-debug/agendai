import Stripe from 'stripe';
import { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-04-10',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { session_id } = req.query;

    if (!session_id) {
        return res.status(400).json({ error: 'Missing session_id' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id as string);
        return res.status(200).json({ email: session.customer_details?.email });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
}

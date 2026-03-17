// api/webhooks/abacatepay.ts
// Webhook que recebe a confirmação de pagamento da AbacatePay
// POST /api/webhooks/abacatepay
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const body = req.body;

        // Estrutura típica do webhook AbacatePay
        const chargeId = body?.data?.id || body?.id || body?.charge_id;
        const status = body?.data?.status || body?.status;

        if (!chargeId) {
            console.error('Webhook AbacatePay: charge_id não encontrado no body', body);
            return res.status(400).json({ error: 'charge_id não encontrado' });
        }

        // Busca o agendamento com esse charge_id
        const { data: appointment, error: findError } = await supabase
            .from('appointments')
            .select('id, business_id, client_name, client_phone')
            .eq('abacatepay_charge_id', chargeId)
            .single();

        if (findError || !appointment) {
            console.error('Webhook AbacatePay: agendamento não encontrado para charge_id', chargeId);
            // Retorna 200 mismo assim para não receber retries da AbacatePay
            return res.status(200).json({ received: true, warning: 'agendamento não encontrado' });
        }

        // Só processa se o pagamento foi confirmado
        if (status === 'PAID' || status === 'paid' || status === 'COMPLETED' || status === 'completed') {
            const valorPago = body?.data?.amount || body?.amount || null;

            const { error: updateError } = await supabase
                .from('appointments')
                .update({
                    status_pagamento: 'pago',
                    valor_pago: valorPago ? valorPago / 100 : null, // AbacatePay envia em centavos
                    pago_em: new Date().toISOString(),
                })
                .eq('abacatepay_charge_id', chargeId);

            if (updateError) {
                console.error('Webhook AbacatePay: erro ao atualizar agendamento', updateError);
                return res.status(500).json({ error: 'Erro ao atualizar agendamento' });
            }

            // Busca configurações de WhatsApp do negócio para disparar confirmação
            const { data: business } = await supabase
                .from('businesses')
                .select('whatsapp_habilitado, msg_confirmacao, name')
                .eq('id', appointment.business_id)
                .single();

            const WAHA_URL = process.env.WAHA_URL || 'https://2n8n-waha.oggciy.easypanel.host';
            const WAHA_API_KEY = process.env.WAHA_API_KEY || 'SBrNRu8doChS8amCmy1sI7PmpXyR8eba';

            // Dispara WhatsApp se habilitado
            if (business?.whatsapp_habilitado && appointment.client_phone) {
                try {
                    // Formata telefone: remove tudo que não é número
                    const telefone = appointment.client_phone.replace(/\D/g, '');
                    const chatId = `${telefone}@c.us`;

                    let mensagem = business.msg_confirmacao || `Olá {nome}! Seu agendamento foi confirmado. Obrigado!`;
                    mensagem = mensagem
                        .replace('{nome}', appointment.client_name)
                        .replace('{negocio}', business.name || '');

                    await fetch(`${WAHA_URL.replace(/\/$/, '')}/api/sendText`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Api-Key': WAHA_API_KEY,
                        },
                        body: JSON.stringify({
                            session: 'default', // Obrigatório ser 'default' no WAHA Core
                            chatId,
                            text: mensagem,
                        }),
                    });
                } catch (wahaErr) {
                    // Não falha o webhook por erro de WhatsApp
                    console.error('Webhook AbacatePay: erro ao enviar WhatsApp', wahaErr);
                }
            }

            console.log(`Webhook AbacatePay: pagamento confirmado para agendamento ${appointment.id}`);
        }

        // Sempre retorna 200 para AbacatePay não tentar de novo
        return res.status(200).json({ received: true });
    } catch (err: any) {
        console.error('Webhook AbacatePay: erro inesperado', err);
        return res.status(500).json({ error: err.message });
    }
}

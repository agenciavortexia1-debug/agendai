import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const WAHA_URL = process.env.WAHA_URL || 'https://2n8n-waha.oggciy.easypanel.host';
const WAHA_API_KEY = process.env.WAHA_API_KEY || 'SBrNRu8doChS8amCmy1sI7PmpXyR8eba';

// Sessão WAHA — 'default' para WAHA Core (gratuito)
// Quando migrar para o WAHA Plus, trocar para business_id do parâmetro recebido
const WAHA_SESSION = 'default';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Apenas POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { business_id, client_phone, client_name, tipo } = req.body as {
        business_id: string;
        client_phone: string;
        client_name: string;
        tipo: 'confirmacao' | 'lembrete' | 'cancelamento' | 'pos';
    };

    if (!business_id || !client_phone) {
        return res.status(400).json({ error: 'business_id e client_phone são obrigatórios' });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Busca config do negócio
        const { data: business, error: bizErr } = await supabase
            .from('businesses')
            .select('whatsapp_habilitado, msg_confirmacao, msg_lembrete, msg_cancelamento, msg_pos_atendimento, name')
            .eq('id', business_id)
            .single();

        if (bizErr || !business) {
            return res.status(404).json({ error: 'Negócio não encontrado' });
        }

        if (!business.whatsapp_habilitado) {
            return res.status(200).json({ skipped: true, reason: 'WhatsApp desabilitado para este negócio' });
        }

        // Escolhe o template correto
        const templateMap: Record<string, string | null> = {
            confirmacao: business.msg_confirmacao,
            lembrete: business.msg_lembrete,
            cancelamento: business.msg_cancelamento,
            pos: business.msg_pos_atendimento,
        };

        let mensagem = templateMap[tipo] || `Olá {nome}! Seu agendamento foi confirmado. Obrigado por escolher ${business.name || 'nosso serviço'}!`;

        // Substitui as variáveis básicas disponíveis neste contexto
        mensagem = mensagem
            .replace(/{nome}/g, client_name || 'Cliente')
            .replace(/{negocio}/g, business.name || '');

        // Formata telefone: remove tudo que não é número e adiciona @c.us
        const telefone = client_phone.replace(/\D/g, '');
        if (!telefone || telefone.length < 10) {
            return res.status(400).json({ error: 'Telefone inválido: ' + client_phone });
        }
        const chatId = `${telefone}@c.us`;

        // Envia via WAHA
        const wahaResp = await fetch(`${WAHA_URL.replace(/\/$/, '')}/api/sendText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': WAHA_API_KEY,
            },
            body: JSON.stringify({
                session: WAHA_SESSION,
                chatId,
                text: mensagem,
            }),
        });

        const wahaData = await wahaResp.json().catch(() => ({}));

        if (!wahaResp.ok) {
            console.error('WAHA sendText error:', wahaResp.status, wahaData);
            return res.status(502).json({ error: `WAHA retornou ${wahaResp.status}: ${JSON.stringify(wahaData)}` });
        }

        return res.status(200).json({ success: true, waha: wahaData });

    } catch (err: any) {
        console.error('send-whatsapp error:', err);
        return res.status(500).json({ error: err.message });
    }
}

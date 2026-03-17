// api/whatsapp-template.ts
// Endpoint para o n8n ler o template de mensagem salvo no banco
// GET /api/whatsapp-template?business_id=xxx
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { business_id, slug } = req.query as Record<string, string>;

    if (!business_id && !slug) {
        return res.status(400).json({ error: 'business_id ou slug são obrigatórios' });
    }

    try {
        let query = supabase
            .from('businesses')
            .select('msg_confirmacao, msg_lembrete, msg_cancelamento, msg_pos_atendimento, lembrete_horas_antes, whatsapp_habilitado');

        if (business_id) {
            query = query.eq('id', business_id);
        } else {
            query = query.eq('slug', slug);
        }

        const { data, error } = await query.single();

        if (error || !data) {
            return res.status(404).json({ error: 'Negócio não encontrado' });
        }

        return res.status(200).json({
            habilitado: data.whatsapp_habilitado,
            templates: {
                confirmacao: data.msg_confirmacao,
                lembrete: data.msg_lembrete,
                cancelamento: data.msg_cancelamento,
                pos_atendimento: data.msg_pos_atendimento,
            },
            lembrete_horas_antes: data.lembrete_horas_antes,
            waha_session: business_id || data.id // Retornar apenas a session (ID) para o n8n saber pra qual ID disparar
        });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
}

// api/waha-proxy.ts
// Proxy para chamadas à API WAHA — protege a API key no servidor
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action, url, session, key } = req.query as Record<string, string>;

    if (!url || !session) {
        return res.status(400).json({ error: 'url e session são obrigatórios' });
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (key) {
        headers['X-Api-Key'] = key;
    }

    try {
        if (action === 'status') {
            // GET /api/sessions/{session}
            const resp = await fetch(`${url}/api/sessions/${session}`, { headers });
            const data = await resp.json();
            return res.status(200).json(data);
        }

        if (action === 'start') {
            // POST /api/sessions/start
            const resp = await fetch(`${url}/api/sessions/start`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: session }),
            });
            const data = await resp.json();
            return res.status(200).json(data);
        }

        if (action === 'stop') {
            // POST /api/sessions/stop com logout: true
            const resp = await fetch(`${url}/api/sessions/stop`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: session, logout: true }),
            });
            const data = await resp.json();
            return res.status(200).json(data);
        }

        if (action === 'send') {
            // POST /api/sendText — usado pelo backend para enviar mensagem
            const body = req.body;
            const resp = await fetch(`${url}/api/sendText`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });
            const data = await resp.json();
            return res.status(200).json(data);
        }

        return res.status(400).json({ error: 'action inválida' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Erro ao contatar WAHA' });
    }
}

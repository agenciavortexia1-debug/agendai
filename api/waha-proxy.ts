// api/waha-proxy.ts
// Proxy seguro para chamadas ao WAHA — nunca expõe a API Key no cliente
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action, url, session, key } = req.query as Record<string, string>;

    if (!url || !session) {
        return res.status(400).json({ error: 'url e session são obrigatórios' });
    }

    // Remove barra final da URL
    const baseUrl = url.replace(/\/$/, '');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Api-Key': key || '',
    };

    try {
        // ─── STATUS ────────────────────────────────────────────────
        if (action === 'status') {
            const resp = await fetch(`${baseUrl}/api/sessions/${session}`, { headers });
            if (!resp.ok) {
                const text = await resp.text();
                return res.status(resp.status).json({ error: text, status: 'UNKNOWN' });
            }
            const data = await resp.json();
            return res.status(200).json(data);
        }

        // ─── QR CODE (busca pelo servidor e retorna como base64) ───
        if (action === 'qr') {
            const qrUrl = `${baseUrl}/api/${session}/auth/qr?format=image`;
            const resp = await fetch(qrUrl, {
                headers: { 'X-Api-Key': key || '' },
            });

            if (!resp.ok) {
                const text = await resp.text();
                return res.status(resp.status).json({ error: `WAHA retornou ${resp.status}: ${text}` });
            }

            const contentType = resp.headers.get('content-type') || 'image/png';
            const buffer = await resp.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const dataUrl = `data:${contentType};base64,${base64}`;

            return res.status(200).json({ qrBase64: dataUrl });
        }

        // ─── INICIAR SESSÃO ────────────────────────────────────────
        if (action === 'start') {
            const resp = await fetch(`${baseUrl}/api/sessions/start`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: session }),
            });
            const text = await resp.text();
            try {
                return res.status(resp.status).json(JSON.parse(text));
            } catch {
                return res.status(resp.status).json({ raw: text });
            }
        }

        // ─── PARAR / DESCONECTAR ───────────────────────────────────
        if (action === 'stop') {
            const resp = await fetch(`${baseUrl}/api/sessions/stop`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: session, logout: true }),
            });
            const text = await resp.text();
            try {
                return res.status(resp.status).json(JSON.parse(text));
            } catch {
                return res.status(resp.status).json({ raw: text });
            }
        }

        // ─── ENVIAR MENSAGEM ───────────────────────────────────────
        if (action === 'send') {
            const body = req.body;
            const resp = await fetch(`${baseUrl}/api/sendText`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    session,
                    chatId: body.chatId,
                    text: body.text,
                }),
            });
            const text = await resp.text();
            try {
                return res.status(resp.status).json(JSON.parse(text));
            } catch {
                return res.status(resp.status).json({ raw: text });
            }
        }

        return res.status(400).json({ error: `action inválida: ${action}` });

    } catch (err: any) {
        console.error('waha-proxy error:', err);
        return res.status(500).json({ error: err.message || 'Erro ao contatar WAHA' });
    }
}

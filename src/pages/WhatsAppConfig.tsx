import React, { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft, Wifi, WifiOff, RefreshCw, LogOut, MessageSquare,
    Save, Copy, CheckCircle2, AlertCircle, Loader2, Smartphone,
    Bold, Italic, Strikethrough, Code, QrCode, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

// ─── Variáveis dos templates ───────────────────────────────────────────────
const VARIAVEIS = [
    { label: '{nome}', desc: 'Nome do cliente' },
    { label: '{servico}', desc: 'Serviço agendado' },
    { label: '{data}', desc: 'Data do agendamento' },
    { label: '{hora}', desc: 'Hora do agendamento' },
    { label: '{profissional}', desc: 'Nome do profissional' },
    { label: '{negocio}', desc: 'Nome do negócio' },
];

const DADOS_EXEMPLO: Record<string, string> = {
    '{nome}': 'Maria Silva',
    '{servico}': 'Corte de Cabelo',
    '{data}': '20/03/2026',
    '{hora}': '14:30',
    '{profissional}': 'João',
    '{negocio}': 'Barbearia do João',
};

function substituirVariaveis(template: string): string {
    let result = template;
    for (const [v, val] of Object.entries(DADOS_EXEMPLO)) {
        result = result.replaceAll(v, val);
    }
    return result;
}

function formatarWhatsApp(text: string): string {
    return text
        .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
        .replace(/_([^_\n]+)_/g, '<em>$1</em>')
        .replace(/~([^~\n]+)~/g, '<s>$1</s>')
        .replace(/```([^`]+)```/g, '<code class="bg-zinc-200 px-1 rounded text-xs font-mono">$1</code>')
        .replace(/\n/g, '<br>');
}

// ─── Tipos ─────────────────────────────────────────────────────────────────
type WahaStatus = 'WORKING' | 'STOPPED' | 'SCAN_QR_CODE' | 'STARTING' | 'UNKNOWN' | 'LOADING';
type TemplateKey = 'confirmacao' | 'lembrete' | 'cancelamento' | 'pos';

const STATUS_INFO: Record<WahaStatus, { label: string; color: string; bg: string; icon: string }> = {
    WORKING:      { label: 'Conectado ✓',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: '🟢' },
    STOPPED:      { label: 'Desconectado',       color: 'text-red-600',    bg: 'bg-red-50 border-red-200',         icon: '🔴' },
    SCAN_QR_CODE: { label: 'Aguardando scan',    color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',     icon: '🟡' },
    STARTING:     { label: 'Iniciando...',        color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',       icon: '🔵' },
    UNKNOWN:      { label: 'Sem resposta',        color: 'text-zinc-600',   bg: 'bg-zinc-50 border-zinc-200',       icon: '⚪' },
    LOADING:      { label: 'Verificando...',      color: 'text-zinc-500',   bg: 'bg-zinc-50 border-zinc-200',       icon: '⏳' },
};

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
    confirmacao: 'Confirmação',
    lembrete: 'Lembrete',
    cancelamento: 'Cancelamento',
    pos: 'Pós-Atendimento',
};

const TEMPLATE_HINTS: Record<TemplateKey, string> = {
    confirmacao: 'Enviada imediatamente após o agendamento ser criado.',
    lembrete: 'Enviada automaticamente antes do horário (conforme horas configuradas).',
    cancelamento: 'Enviada quando o agendamento é cancelado.',
    pos: 'Enviada após o término do serviço.',
};

// ─── Componente principal ──────────────────────────────────────────────────
export default function WhatsAppConfig({ session }: { session: Session }) {
    const [activeTab, setActiveTab] = useState<'conexao' | 'editor'>('conexao');
    const [businessId, setBusinessId] = useState<string | null>(null);

    // Config WAHA
    const [whatsappHabilitado, setWhatsappHabilitado] = useState(false);
    const [lembretesHoras, setLembretesHoras] = useState('24, 2');

    // Templates
    const [templates, setTemplates] = useState<Record<TemplateKey, string>>({
        confirmacao: 'Olá {nome}! Seu agendamento de *{servico}* foi confirmado para *{data}* às *{hora}* com {profissional}. Te esperamos! 😊',
        lembrete: 'Olá {nome}! Lembrando que você tem *{servico}* amanhã às *{hora}* com {profissional} em {negocio}. Até lá! 👋',
        cancelamento: 'Olá {nome}, seu agendamento de *{servico}* do dia {data} às {hora} foi cancelado. Para reagendar, acesse nosso link.',
        pos: 'Olá {nome}! Esperamos que tenha gostado do *{servico}* com {profissional}. Obrigado pela preferência! 🙏',
    });
    const [activeTemplate, setActiveTemplate] = useState<TemplateKey>('confirmacao');
    const templateRef = useRef<HTMLTextAreaElement>(null);

    // Status e QR
    const [status, setStatus] = useState<WahaStatus>('UNKNOWN');
    const [qrBase64, setQrBase64] = useState<string | null>(null);
    const [qrTimer, setQrTimer] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Loading
    const [loadingStatus, setLoadingStatus]   = useState(false);
    const [loadingQr, setLoadingQr]           = useState(false);
    const [loadingStart, setLoadingStart]     = useState(false);
    const [loadingStop, setLoadingStop]       = useState(false);
    const [saving, setSaving]                 = useState(false);
    const [saveMsg, setSaveMsg]               = useState<string | null>(null);
    const [copied, setCopied]                 = useState(false);

    // Refs para intervalo
    const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Load config ────────────────────────────────────────────────
    useEffect(() => { loadConfig(); }, [session]);

    async function loadConfig() {
        const { data } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (data) {
            setBusinessId(data.id);
            setWhatsappHabilitado(data.whatsapp_habilitado || false);
            if (data.lembrete_horas_antes?.length) {
                setLembretesHoras((data.lembrete_horas_antes as number[]).join(', '));
            }
            setTemplates(prev => ({
                confirmacao: data.msg_confirmacao  || prev.confirmacao,
                lembrete:    data.msg_lembrete     || prev.lembrete,
                cancelamento: data.msg_cancelamento || prev.cancelamento,
                pos:         data.msg_pos_atendimento || prev.pos,
            }));
        }
    }

    useEffect(() => () => { stopPoll(); stopTimer(); }, []);

    // ─── Helpers de proxy ────────────────────────────────────────────
    function proxyUrl(action: string) {
        if (!businessId) return '';
        const params = new URLSearchParams({
            action,
            session: businessId, // Usamos o ID do negócio como nome da sessão
        });
        return `/api/waha-proxy?${params}`;
    }

    // ─── Status polling ──────────────────────────────────────────────
    function startPoll() {
        stopPoll();
        pollRef.current = setInterval(async () => {
            try {
                const resp = await fetch(proxyUrl('status'));
                const data = await resp.json();
                const s: WahaStatus = data?.status === 'WORKING'      ? 'WORKING'
                                    : data?.status === 'SCAN_QR_CODE' ? 'SCAN_QR_CODE'
                                    : data?.status === 'STARTING'     ? 'STARTING'
                                    : data?.status === 'STOPPED'      ? 'STOPPED'
                                    : 'UNKNOWN';
                setStatus(s);
                if (s === 'WORKING') {
                    stopPoll();
                    stopTimer();
                    setQrBase64(null);
                    setErrorMsg(null);
                }
            } catch { /* silencioso */ }
        }, 3500);
    }

    function stopPoll() {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }

    // ─── Timer do QR ─────────────────────────────────────────────────
    function startTimer(seconds = 60) {
        stopTimer();
        setQrTimer(seconds);
        timerRef.current = setInterval(() => {
            setQrTimer(prev => {
                if (prev <= 1) { stopTimer(); setQrBase64(null); return 0; }
                return prev - 1;
            });
        }, 1000);
    }

    function stopTimer() {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }

    // ─── Verificar status ─────────────────────────────────────────────
    async function handleCheckStatus() {
        if (!businessId) return;
        setLoadingStatus(true);
        setErrorMsg(null);
        try {
            const resp = await fetch(proxyUrl('status'));
            const data = await resp.json();
            if (!resp.ok) { setErrorMsg(data.error || 'Erro ao verificar status'); return; }
            const s: WahaStatus = data?.status === 'WORKING'      ? 'WORKING'
                                : data?.status === 'SCAN_QR_CODE' ? 'SCAN_QR_CODE'
                                : data?.status === 'STARTING'     ? 'STARTING'
                                : data?.status === 'STOPPED'      ? 'STOPPED'
                                : 'UNKNOWN';
            setStatus(s);
        } catch (err: any) {
            setErrorMsg('Não foi possível contatar o WAHA: ' + err.message);
            setStatus('UNKNOWN');
        } finally {
            setLoadingStatus(false);
        }
    }

    // ─── Buscar QR ───────────────────────────────────────────────────
    async function handleGetQr() {
        if (!businessId) return;
        setLoadingQr(true);
        setQrBase64(null);
        setErrorMsg(null);
        try {
            const resp = await fetch(proxyUrl('qr'));
            const data = await resp.json();
            if (!resp.ok || data.error) {
                setErrorMsg(data.error || 'Erro ao buscar QR code');
                return;
            }
            setQrBase64(data.qrBase64);
            startTimer(60);
            startPoll(); // começa polling para detectar quando conectar
        } catch (err: any) {
            setErrorMsg('Erro ao buscar QR: ' + err.message);
        } finally {
            setLoadingQr(false);
        }
    }

    // ─── Iniciar sessão ───────────────────────────────────────────────
    async function handleStart() {
        if (!businessId) return;
        setLoadingStart(true);
        setErrorMsg(null);
        try {
            setStatus('STARTING');
            const resp = await fetch(proxyUrl('start'), { method: 'POST' });
            // Aguarda 1.5s e vai buscar o QR
            await new Promise(r => setTimeout(r, 1500));
            await handleGetQr();
        } catch (err: any) {
            setErrorMsg('Erro ao iniciar sessão: ' + err.message);
            setStatus('UNKNOWN');
        } finally {
            setLoadingStart(false);
        }
    }

    // ─── Desconectar ─────────────────────────────────────────────────
    async function handleStop() {
        if (!confirm('Deseja desconectar e encerrar a sessão WhatsApp?')) return;
        setLoadingStop(true);
        setErrorMsg(null);
        try {
            await fetch(proxyUrl('stop'), { method: 'POST' });
            setStatus('STOPPED');
            setQrBase64(null);
            stopPoll();
            stopTimer();
        } catch (err: any) {
            setErrorMsg('Erro ao desconectar: ' + err.message);
        } finally {
            setLoadingStop(false);
        }
    }

    // ─── Salvar configurações ─────────────────────────────────────────
    async function handleSave() {
        if (!businessId) return;
        setSaving(true);
        setSaveMsg(null);
        try {
            const horasArray = lembretesHoras
                .split(',')
                .map(h => parseInt(h.trim()))
                .filter(h => !isNaN(h) && h > 0);

            const { error } = await supabase.from('businesses').update({
                whatsapp_habilitado: whatsappHabilitado,
                msg_confirmacao: templates.confirmacao || null,
                msg_lembrete: templates.lembrete || null,
                msg_cancelamento: templates.cancelamento || null,
                msg_pos_atendimento: templates.pos || null,
                lembrete_horas_antes: horasArray.length > 0 ? horasArray : null,
            }).eq('id', businessId);

            if (error) throw error;
            setSaveMsg('Salvo com sucesso!');
            setTimeout(() => setSaveMsg(null), 3000);
        } catch (err: any) {
            setSaveMsg('Erro: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    // ─── Editor de templates ──────────────────────────────────────────
    function insertVariavel(v: string) {
        const el = templateRef.current;
        const cur = templates[activeTemplate];
        if (!el) { setTemplates(prev => ({ ...prev, [activeTemplate]: cur + v })); return; }
        const s = el.selectionStart, e = el.selectionEnd;
        const next = cur.substring(0, s) + v + cur.substring(e);
        setTemplates(prev => ({ ...prev, [activeTemplate]: next }));
        setTimeout(() => { el.focus(); el.setSelectionRange(s + v.length, s + v.length); }, 0);
    }

    function insertFormat(open: string, close: string) {
        const el = templateRef.current;
        if (!el) return;
        const cur = templates[activeTemplate];
        const s = el.selectionStart, e = el.selectionEnd;
        const selected = cur.substring(s, e);
        const next = cur.substring(0, s) + open + selected + close + cur.substring(e);
        setTemplates(prev => ({ ...prev, [activeTemplate]: next }));
        setTimeout(() => el.focus(), 0);
    }

    function handleCopy() {
        navigator.clipboard.writeText(templates[activeTemplate]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const si = STATUS_INFO[status];
    const canGetQr = businessId && (status !== 'WORKING');
    const canConnect = businessId && (status === 'STOPPED' || status === 'UNKNOWN');

    // ─── Render ───────────────────────────────────────────────────────
    return (
        <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-zinc-50">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">

                {/* Header */}
                <header className="flex-shrink-0 bg-white border-b border-zinc-100 px-4 md:px-6 h-14 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link to="/dashboard" className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-sm font-bold text-zinc-900 leading-tight">WhatsApp / WAHA</h1>
                            <p className="text-[10px] text-zinc-400 hidden sm:block">Conexão e mensagens automáticas</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Toggle habilitado */}
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <span className="text-[11px] text-zinc-500 hidden sm:block">Ativo</span>
                            <div onClick={() => setWhatsappHabilitado(v => !v)}
                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${whatsappHabilitado ? 'bg-emerald-500' : 'bg-zinc-200'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${whatsappHabilitado ? 'left-5' : 'left-0.5'}`} />
                            </div>
                        </label>
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-black transition-all disabled:opacity-60">
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{saving ? 'Salvando...' : 'Salvar'}</span>
                        </button>
                    </div>
                </header>

                {/* Toast de save */}
                <AnimatePresence>
                    {saveMsg && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={`mx-4 mt-2 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${saveMsg.startsWith('Erro') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            {saveMsg.startsWith('Erro') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saveMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tabs */}
                <div className="flex-shrink-0 bg-white border-b border-zinc-100 px-4 flex">
                    {(['conexao', 'editor'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-5 py-3 text-xs font-semibold border-b-2 transition-all ${activeTab === tab ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
                            {tab === 'conexao' ? '📡 Conexão' : '✏️ Mensagens'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">

                    {/* ═══════════ ABA CONEXÃO ═══════════ */}
                    {activeTab === 'conexao' && (
                        <div className="max-w-xl space-y-4">

                            {/* Configuração de Lembretes */}
                            <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-3">
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest gap-2 flex items-center">
                                    <MessageSquare className="w-3.5 h-3.5" /> Frequência de Lembretes
                                </h3>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Horas antes do agendamento (separado por vírgula)</label>
                                    <input type="text" value={lembretesHoras} onChange={e => setLembretesHoras(e.target.value)}
                                        className="mt-1 w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all"
                                        placeholder="24, 2" />
                                    <p className="text-[10px] text-zinc-400 mt-1">Ex: 24, 2 = O cliente receberá um aviso um dia antes e outro 2 horas antes.</p>
                                </div>
                            </div>

                            {/* Painel de status + QR */}
                            <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Status da Conexão</h3>
                                    <button onClick={handleCheckStatus} disabled={!businessId || loadingStatus}
                                        className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-800 disabled:opacity-40 transition-colors">
                                        <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
                                        Atualizar
                                    </button>
                                </div>

                                {/* Status badge */}
                                <div className={`flex items-center gap-3 p-3 rounded-xl border ${si.bg}`}>
                                    <span className="text-xl">{si.icon}</span>
                                    <div>
                                        <p className={`text-sm font-bold ${si.color}`}>{si.label}</p>
                                        <p className="text-[11px] text-zinc-500">
                                            {status === 'WORKING'      && 'WhatsApp conectado. Mensagens automáticas ativas.'}
                                            {status === 'STOPPED'      && 'Sessão parada. Clique em "Conectar" para iniciar.'}
                                            {status === 'SCAN_QR_CODE' && 'Sessão iniciada. Clique em "Obter QR" e escaneie com seu WhatsApp.'}
                                            {status === 'STARTING'     && 'Aguarde, iniciando integração WhatsApp...'}
                                            {status === 'UNKNOWN'      && 'Verificando conexão...'}
                                            {status === 'LOADING'      && 'Verificando conexão com o WAHA...'}
                                        </p>
                                    </div>
                                </div>

                                {/* Erro */}
                                {errorMsg && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                {/* QR code */}
                                <AnimatePresence>
                                    {qrBase64 && (
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                            className="flex flex-col items-center gap-3 py-2">
                                            <div className="relative">
                                                <img src={qrBase64} alt="QR Code WhatsApp"
                                                    className="w-56 h-56 rounded-2xl border-4 border-white shadow-lg object-contain bg-white" />
                                                {qrTimer > 0 && qrTimer <= 15 && (
                                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                                                        Expira em {qrTimer}s
                                                    </div>
                                                )}
                                            </div>
                                            {qrTimer > 15 && (
                                                <p className="text-xs text-zinc-400">
                                                    Expira em <strong className="text-zinc-700">{qrTimer}s</strong> · Abra o WhatsApp → Dispositivos vinculados
                                                </p>
                                            )}
                                            {qrTimer === 0 && (
                                                <p className="text-xs text-red-500 font-medium">QR expirado. Solicite um novo abaixo.</p>
                                            )}

                                            {/* Instruções */}
                                            <div className="w-full bg-zinc-50 rounded-xl p-3 space-y-1">
                                                <p className="text-[11px] font-bold text-zinc-600">Como escanear:</p>
                                                {[
                                                    'Abra o WhatsApp no celular',
                                                    'Toque em ⋮ (Android) ou Configurações ⚙️ (iPhone)',
                                                    'Toque em Dispositivos vinculados → Vincular dispositivo',
                                                    'Aponte a câmera para o QR code acima',
                                                ].map((step, i) => (
                                                    <p key={i} className="text-[11px] text-zinc-500">{i + 1}. {step}</p>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Botões de ação */}
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {/* Conectar (sessão STOPPED ou UNKNOWN) */}
                                    {canConnect && (
                                        <button onClick={handleStart} disabled={loadingStart}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-50 transition-all">
                                            {loadingStart ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                            Conectar WhatsApp
                                        </button>
                                    )}

                                    {/* Obter QR (quando sessão está aguardando scan) */}
                                    {canGetQr && (
                                        <button onClick={handleGetQr} disabled={loadingQr}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 text-white rounded-xl text-sm font-semibold hover:bg-zinc-900 disabled:opacity-50 transition-all">
                                            {loadingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                                            {qrTimer > 0 ? 'Novo QR Code' : 'Obter QR Code'}
                                        </button>
                                    )}

                                    {/* Desconectar (quando conectado) */}
                                    {status === 'WORKING' && (
                                        <button onClick={handleStop} disabled={loadingStop}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition-all">
                                            {loadingStop ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                            Desconectar
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                    {/* ═══════════ ABA EDITOR ═══════════ */}
                    {activeTab === 'editor' && (
                        <div className="max-w-3xl space-y-4">

                            {/* Seletor de template */}
                            <div className="bg-white rounded-xl p-5 border border-zinc-200">
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Selecionar mensagem</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map(key => (
                                        <button key={key} onClick={() => setActiveTemplate(key)}
                                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${activeTemplate === key ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'}`}>
                                            {TEMPLATE_LABELS[key]}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-2">{TEMPLATE_HINTS[activeTemplate]}</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                {/* Editor */}
                                <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-3">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                        Editor — {TEMPLATE_LABELS[activeTemplate]}
                                    </h3>

                                    {/* Variáveis */}
                                    <div>
                                        <p className="text-[10px] text-zinc-400 mb-1.5">Inserir variável:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {VARIAVEIS.map(v => (
                                                <button key={v.label} onClick={() => insertVariavel(v.label)} title={v.desc}
                                                    className="px-2.5 py-1 bg-zinc-900 text-white text-[10px] font-mono rounded-md hover:bg-zinc-700 transition-all">
                                                    {v.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Formatação */}
                                    <div className="flex gap-1">
                                        <button onClick={() => insertFormat('*', '*')} className="p-1.5 rounded border border-zinc-200 hover:bg-zinc-50" title="Negrito"><Bold className="w-3.5 h-3.5 text-zinc-600" /></button>
                                        <button onClick={() => insertFormat('_', '_')} className="p-1.5 rounded border border-zinc-200 hover:bg-zinc-50" title="Itálico"><Italic className="w-3.5 h-3.5 text-zinc-600" /></button>
                                        <button onClick={() => insertFormat('~', '~')} className="p-1.5 rounded border border-zinc-200 hover:bg-zinc-50" title="Tachado"><Strikethrough className="w-3.5 h-3.5 text-zinc-600" /></button>
                                        <button onClick={() => insertFormat('```', '```')} className="p-1.5 rounded border border-zinc-200 hover:bg-zinc-50" title="Monoespaço"><Code className="w-3.5 h-3.5 text-zinc-600" /></button>
                                    </div>

                                    <textarea ref={templateRef} value={templates[activeTemplate]}
                                        onChange={e => setTemplates(prev => ({ ...prev, [activeTemplate]: e.target.value }))}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm resize-y min-h-[160px] font-mono focus:ring-2 focus:ring-zinc-900 transition-all"
                                        placeholder="Digite a mensagem..." />

                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-zinc-400">{templates[activeTemplate].length} chars</span>
                                        <button onClick={handleCopy} className="text-[11px] flex items-center gap-1 text-zinc-500 hover:text-zinc-800">
                                            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? 'Copiado!' : 'Copiar'}
                                        </button>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-3">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <MessageSquare className="w-3.5 h-3.5" />Preview
                                    </h3>
                                    <div className="bg-[#e5ddd5] rounded-xl p-4 min-h-[200px] flex flex-col items-end gap-2">
                                        <div className="max-w-[85%] bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm">
                                            <p className="text-sm text-zinc-800 leading-relaxed break-words"
                                                dangerouslySetInnerHTML={{ __html: formatarWhatsApp(substituirVariaveis(templates[activeTemplate])) }} />
                                            <p className="text-[10px] text-zinc-400 text-right mt-1">agora ✓✓</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Dados de exemplo:</p>
                                        {VARIAVEIS.map(v => (
                                            <div key={v.label} className="flex items-center gap-2 text-[10px]">
                                                <span className="font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{v.label}</span>
                                                <span className="text-zinc-500">→ {DADOS_EXEMPLO[v.label]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

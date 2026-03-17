import React, { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import {
    ArrowLeft, Wifi, WifiOff, RefreshCw, LogOut, MessageSquare,
    Save, Copy, CheckCircle2, AlertCircle, Loader2, Smartphone,
    Bold, Italic, Strikethrough, Code, ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

// Variáveis disponíveis para templates
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
    for (const [variavel, valor] of Object.entries(DADOS_EXEMPLO)) {
        result = result.replaceAll(variavel, valor);
    }
    return result;
}

function formatarWhatsApp(text: string): string {
    return text
        .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        .replace(/~([^~]+)~/g, '<s>$1</s>')
        .replace(/```([^`]+)```/g, '<code class="bg-zinc-200 px-1 rounded text-xs">$1</code>')
        .replace(/\n/g, '<br>');
}

export default function WhatsAppConfig({ session }: { session: Session }) {
    const [activeTab, setActiveTab] = useState<'conexao' | 'editor'>('conexao');
    const [businessId, setBusinessId] = useState<string | null>(null);

    // Config
    const [wahaUrl, setWahaUrl] = useState('');
    const [wahaSession, setWahaSession] = useState('default');
    const [wahaApiKey, setWahaApiKey] = useState('');
    const [whatsappHabilitado, setWhatsappHabilitado] = useState(false);

    // Templates
    const [msgConfirmacao, setMsgConfirmacao] = useState('Olá {nome}! Seu agendamento de *{servico}* foi confirmado para o dia *{data}* às *{hora}* com {profissional}. Te esperamos! 😊');
    const [msgLembrete, setMsgLembrete] = useState('Olá {nome}! Lembrando que você tem {servico} amanhã às {hora} com {profissional} em {negocio}. Até lá! 👋');
    const [msgCancelamento, setMsgCancelamento] = useState('Olá {nome}, seu agendamento de *{servico}* do dia {data} às {hora} foi cancelado. Para reagendar, acesse nosso link.');
    const [msgPosAtendimento, setMsgPosAtendimento] = useState('Olá {nome}! Esperamos que tenha gostado do seu {servico} com {profissional}. Obrigado pela preferência! 🙏');
    const [lembretesHoras, setLembretesHoras] = useState('24, 2');
    const [activeTemplate, setActiveTemplate] = useState<'confirmacao' | 'lembrete' | 'cancelamento' | 'pos'>('confirmacao');

    // Status WAHA
    const [status, setStatus] = useState<'WORKING' | 'STOPPED' | 'SCAN_QR_CODE' | 'UNKNOWN' | 'LOADING'>('LOADING');
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [qrTimer, setQrTimer] = useState(0);
    const [loadingQr, setLoadingQr] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false);

    // Saving
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const templateRef = useRef<HTMLTextAreaElement>(null);
    const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const activeTemplateValue = {
        confirmacao: msgConfirmacao,
        lembrete: msgLembrete,
        cancelamento: msgCancelamento,
        pos: msgPosAtendimento,
    }[activeTemplate];

    const setActiveTemplateValue = (value: string) => {
        if (activeTemplate === 'confirmacao') setMsgConfirmacao(value);
        if (activeTemplate === 'lembrete') setMsgLembrete(value);
        if (activeTemplate === 'cancelamento') setMsgCancelamento(value);
        if (activeTemplate === 'pos') setMsgPosAtendimento(value);
    };

    useEffect(() => {
        loadConfig();
    }, [session]);

    async function loadConfig() {
        const { data } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (data) {
            setBusinessId(data.id);
            setWahaUrl(data.waha_url || '');
            setWahaSession(data.waha_session || 'default');
            setWahaApiKey(data.waha_api_key || '');
            setWhatsappHabilitado(data.whatsapp_habilitado || false);
            setMsgConfirmacao(data.msg_confirmacao || msgConfirmacao);
            setMsgLembrete(data.msg_lembrete || msgLembrete);
            setMsgCancelamento(data.msg_cancelamento || msgCancelamento);
            setMsgPosAtendimento(data.msg_pos_atendimento || msgPosAtendimento);
            if (data.lembrete_horas_antes) {
                setLembretesHoras((data.lembrete_horas_antes as number[]).join(', '));
            }
        }
    }

    async function checkStatus() {
        if (!wahaUrl || !wahaSession) return;
        try {
            const resp = await fetch(`/api/waha-proxy?action=status&url=${encodeURIComponent(wahaUrl)}&session=${encodeURIComponent(wahaSession)}&key=${encodeURIComponent(wahaApiKey)}`);
            if (!resp.ok) { setStatus('UNKNOWN'); return; }
            const data = await resp.json();
            const s = data.status as string;
            if (s === 'WORKING') setStatus('WORKING');
            else if (s === 'SCAN_QR_CODE') setStatus('SCAN_QR_CODE');
            else setStatus('STOPPED');
        } catch {
            setStatus('UNKNOWN');
        }
    }

    function startStatusPoll() {
        if (statusPollRef.current) clearInterval(statusPollRef.current);
        statusPollRef.current = setInterval(() => {
            checkStatus();
        }, 4000);
    }

    function stopStatusPoll() {
        if (statusPollRef.current) {
            clearInterval(statusPollRef.current);
            statusPollRef.current = null;
        }
    }

    useEffect(() => {
        if (status === 'WORKING') {
            stopStatusPoll();
            setQrImage(null);
        }
        if (status === 'SCAN_QR_CODE' && !statusPollRef.current) {
            startStatusPoll();
        }
    }, [status]);

    useEffect(() => {
        return () => { stopStatusPoll(); if (qrTimerRef.current) clearInterval(qrTimerRef.current); };
    }, []);

    async function handleCheckStatus() {
        setStatus('LOADING');
        await checkStatus();
        if (status !== 'WORKING') startStatusPoll();
    }

    async function handleGetQr() {
        if (!wahaUrl || !wahaSession) return;
        setLoadingQr(true);
        setQrImage(null);
        try {
            const url = `${wahaUrl}/api/${wahaSession}/auth/qr?format=image`;
            setQrImage(url + '&_t=' + Date.now()); // bust cache
            setQrTimer(60);
            if (qrTimerRef.current) clearInterval(qrTimerRef.current);
            qrTimerRef.current = setInterval(() => {
                setQrTimer(prev => {
                    if (prev <= 1) {
                        if (qrTimerRef.current) clearInterval(qrTimerRef.current!);
                        setQrImage(null);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            startStatusPoll();
        } finally {
            setLoadingQr(false);
        }
    }

    async function handleStartSession() {
        if (!wahaUrl || !wahaSession) return;
        setLoadingAction(true);
        try {
            await fetch(`/api/waha-proxy?action=start&url=${encodeURIComponent(wahaUrl)}&session=${encodeURIComponent(wahaSession)}&key=${encodeURIComponent(wahaApiKey)}`, {
                method: 'POST'
            });
            setTimeout(handleGetQr, 1000);
        } finally {
            setLoadingAction(false);
        }
    }

    async function handleStop() {
        if (!wahaUrl || !wahaSession) return;
        if (!confirm('Deseja desconectar e encerrar a sessão WhatsApp?')) return;
        setLoadingAction(true);
        try {
            await fetch(`/api/waha-proxy?action=stop&url=${encodeURIComponent(wahaUrl)}&session=${encodeURIComponent(wahaSession)}&key=${encodeURIComponent(wahaApiKey)}`, {
                method: 'POST'
            });
            setStatus('STOPPED');
            setQrImage(null);
            stopStatusPoll();
        } finally {
            setLoadingAction(false);
        }
    }

    async function handleSave() {
        if (!businessId) return;
        setSaving(true);
        setSaveMsg(null);
        try {
            const horasArray = lembretesHoras
                .split(',')
                .map(h => parseInt(h.trim()))
                .filter(h => !isNaN(h));

            const { error } = await supabase
                .from('businesses')
                .update({
                    whatsapp_habilitado: whatsappHabilitado,
                    waha_url: wahaUrl || null,
                    waha_session: wahaSession || null,
                    waha_api_key: wahaApiKey || null,
                    msg_confirmacao: msgConfirmacao || null,
                    msg_lembrete: msgLembrete || null,
                    msg_cancelamento: msgCancelamento || null,
                    msg_pos_atendimento: msgPosAtendimento || null,
                    lembrete_horas_antes: horasArray.length > 0 ? horasArray : null,
                })
                .eq('id', businessId);

            if (error) throw error;
            setSaveMsg('Configurações salvas com sucesso!');
            setTimeout(() => setSaveMsg(null), 3000);
        } catch (err: any) {
            setSaveMsg('Erro: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    function insertVariavel(variavel: string) {
        const el = templateRef.current;
        if (!el) {
            setActiveTemplateValue(activeTemplateValue + variavel);
            return;
        }
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newVal = activeTemplateValue.substring(0, start) + variavel + activeTemplateValue.substring(end);
        setActiveTemplateValue(newVal);
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + variavel.length, start + variavel.length);
        }, 0);
    }

    function insertFormat(tag: string, close: string) {
        const el = templateRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selected = activeTemplateValue.substring(start, end);
        const newVal = activeTemplateValue.substring(0, start) + tag + selected + close + activeTemplateValue.substring(end);
        setActiveTemplateValue(newVal);
        setTimeout(() => { el.focus(); }, 0);
    }

    function handleCopy() {
        navigator.clipboard.writeText(activeTemplateValue);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const statusColor = {
        WORKING: 'bg-emerald-500',
        STOPPED: 'bg-red-400',
        SCAN_QR_CODE: 'bg-amber-400',
        UNKNOWN: 'bg-zinc-400',
        LOADING: 'bg-zinc-300',
    }[status];

    const statusLabel = {
        WORKING: 'Conectado',
        STOPPED: 'Desconectado',
        SCAN_QR_CODE: 'Aguardando scan',
        UNKNOWN: 'Status desconhecido',
        LOADING: 'Verificando...',
    }[status];

    const templateLabels = {
        confirmacao: 'Confirmação',
        lembrete: 'Lembrete',
        cancelamento: 'Cancelamento',
        pos: 'Pós-Atendimento',
    };

    return (
        <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-zinc-50">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
                {/* Header */}
                <header className="flex-shrink-0 bg-white border-b border-zinc-100 px-4 md:px-6 h-14 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link to="/dashboard" className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg transition-all flex-shrink-0">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-sm font-sans font-bold text-zinc-900 truncate leading-tight">WhatsApp & WAHA</h1>
                            <p className="text-[10px] text-zinc-400 leading-tight hidden sm:block">Conexão e editor de mensagens</p>
                        </div>
                    </div>
                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1">
                            <span className={`w-2 h-2 rounded-full ${statusColor} ${status === 'LOADING' ? 'animate-pulse' : ''}`} />
                            <span className="text-xs font-medium text-zinc-600">{statusLabel}</span>
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <span className="text-xs text-zinc-500 hidden sm:block">Habilitado</span>
                            <div
                                onClick={() => setWhatsappHabilitado(!whatsappHabilitado)}
                                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${whatsappHabilitado ? 'bg-emerald-500' : 'bg-zinc-200'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${whatsappHabilitado ? 'left-5' : 'left-0.5'}`} />
                            </div>
                        </label>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 bg-zinc-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-black transition-all text-xs disabled:opacity-70"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{saving ? 'Salvando...' : 'Salvar'}</span>
                        </button>
                    </div>
                </header>

                {saveMsg && (
                    <div className={`mx-4 mt-2 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${saveMsg.startsWith('Erro') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        {saveMsg.startsWith('Erro') ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                        {saveMsg}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex-shrink-0 bg-white border-b border-zinc-100 px-4 md:px-6 flex gap-0">
                    {(['conexao', 'editor'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all ${activeTab === tab ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                        >
                            {tab === 'conexao' ? '📡 Conexão' : '✏️ Editor de Mensagem'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">

                    {/* ======= ABA CONEXÃO ======= */}
                    {activeTab === 'conexao' && (
                        <div className="max-w-2xl space-y-4">
                            {/* Configuração da URL */}
                            <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-4">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Configuração do WAHA</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">URL do WAHA</label>
                                        <input
                                            type="url"
                                            value={wahaUrl}
                                            onChange={e => setWahaUrl(e.target.value)}
                                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                                            placeholder="https://waha.meudominio.com"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nome da Sessão</label>
                                            <input
                                                type="text"
                                                value={wahaSession}
                                                onChange={e => setWahaSession(e.target.value)}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                                                placeholder="default"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">API Key</label>
                                            <input
                                                type="password"
                                                value={wahaApiKey}
                                                onChange={e => setWahaApiKey(e.target.value)}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Lembretes — Horas antes (separado por vírgulas)</label>
                                        <input
                                            type="text"
                                            value={lembretesHoras}
                                            onChange={e => setLembretesHoras(e.target.value)}
                                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                                            placeholder="24, 2"
                                        />
                                        <p className="text-[10px] text-zinc-400">Ex: 24, 2 = lembrete 24h antes e 2h antes</p>
                                    </div>
                                </div>
                            </div>

                            {/* Painel de Status e QR */}
                            <div className="bg-white rounded-xl p-5 border border-zinc-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Gerenciar Sessão</h3>
                                    <button
                                        onClick={handleCheckStatus}
                                        disabled={!wahaUrl}
                                        className="text-xs flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 disabled:opacity-40 transition-colors"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Atualizar status
                                    </button>
                                </div>

                                {/* Status visual */}
                                <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${status === 'WORKING' ? 'bg-emerald-50 border border-emerald-100' : status === 'SCAN_QR_CODE' ? 'bg-amber-50 border border-amber-100' : 'bg-zinc-50 border border-zinc-100'}`}>
                                    {status === 'WORKING' ? <Wifi className="w-5 h-5 text-emerald-500" /> :
                                        status === 'SCAN_QR_CODE' ? <Smartphone className="w-5 h-5 text-amber-500" /> :
                                            <WifiOff className="w-5 h-5 text-zinc-400" />}
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-800">{statusLabel}</p>
                                        <p className="text-[11px] text-zinc-500">
                                            {status === 'WORKING' ? 'WhatsApp conectado e pronto para envio.' :
                                                status === 'SCAN_QR_CODE' ? 'Escaneie o QR code com o WhatsApp do celular.' :
                                                    'Clique em "Conectar" para iniciar a sessão.'}
                                        </p>
                                    </div>
                                </div>

                                {/* QR Code */}
                                {qrImage && (
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 mb-4">
                                        <img
                                            src={qrImage}
                                            alt="QR Code WAHA"
                                            className="w-56 h-56 rounded-xl border-2 border-zinc-200 object-contain bg-white p-2"
                                        />
                                        {qrTimer > 0 && (
                                            <div className={`text-xs font-semibold px-3 py-1 rounded-full ${qrTimer < 15 ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-600'}`}>
                                                Expira em {qrTimer}s
                                            </div>
                                        )}
                                        {qrTimer === 0 && (
                                            <p className="text-xs text-zinc-400">QR expirado. Solicite um novo.</p>
                                        )}
                                    </motion.div>
                                )}

                                {/* Ações */}
                                <div className="flex flex-wrap gap-2">
                                    {status !== 'WORKING' && (
                                        <button
                                            onClick={status === 'SCAN_QR_CODE' ? handleGetQr : handleStartSession}
                                            disabled={!wahaUrl || loadingAction || loadingQr}
                                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-semibold hover:bg-black disabled:opacity-50 transition-all"
                                        >
                                            {loadingAction || loadingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                                            {status === 'SCAN_QR_CODE' ? 'Obter QR Code' : 'Conectar / Obter QR'}
                                        </button>
                                    )}
                                    {status === 'WORKING' && (
                                        <button
                                            onClick={handleStop}
                                            disabled={loadingAction}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition-all"
                                        >
                                            {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                            Desconectar
                                        </button>
                                    )}
                                    {qrTimer === 0 && status !== 'WORKING' && qrImage === null && (
                                        <button
                                            onClick={handleGetQr}
                                            disabled={!wahaUrl || loadingQr}
                                            className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 transition-all"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Novo QR Code
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ======= ABA EDITOR ======= */}
                    {activeTab === 'editor' && (
                        <div className="max-w-3xl space-y-4">
                            {/* Seletor de template */}
                            <div className="bg-white rounded-xl p-5 border border-zinc-200">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Selecionar Mensagem</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {(Object.keys(templateLabels) as Array<keyof typeof templateLabels>).map(key => (
                                        <button
                                            key={key}
                                            onClick={() => setActiveTemplate(key)}
                                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${activeTemplate === key ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'}`}
                                        >
                                            {templateLabels[key]}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-2">
                                    {activeTemplate === 'confirmacao' && 'Enviada imediatamente após o agendamento ser criado.'}
                                    {activeTemplate === 'lembrete' && 'Enviada automaticamente antes do horário (conforme horas configuradas).'}
                                    {activeTemplate === 'cancelamento' && 'Enviada quando o status do agendamento muda para cancelado.'}
                                    {activeTemplate === 'pos' && 'Enviada após o término do serviço.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Editor */}
                                <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-3">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Editor — {templateLabels[activeTemplate]}</h3>

                                    {/* Variáveis */}
                                    <div>
                                        <p className="text-[10px] text-zinc-400 mb-1.5">Clique para inserir variável:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {VARIAVEIS.map(v => (
                                                <button
                                                    key={v.label}
                                                    onClick={() => insertVariavel(v.label)}
                                                    title={v.desc}
                                                    className="px-2.5 py-1 bg-zinc-900 text-white text-[10px] font-mono rounded-md hover:bg-zinc-700 transition-all"
                                                >
                                                    {v.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Formatação */}
                                    <div className="flex gap-1">
                                        <button onClick={() => insertFormat('*', '*')} className="p-1.5 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-600" title="Negrito"><Bold className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => insertFormat('_', '_')} className="p-1.5 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-600" title="Itálico"><Italic className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => insertFormat('~', '~')} className="p-1.5 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-600" title="Tachado"><Strikethrough className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => insertFormat('```', '```')} className="p-1.5 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-600" title="Monoespaço"><Code className="w-3.5 h-3.5" /></button>
                                    </div>

                                    <textarea
                                        ref={templateRef}
                                        value={activeTemplateValue}
                                        onChange={e => setActiveTemplateValue(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm resize-y min-h-[160px] font-mono focus:ring-2 focus:ring-primary transition-all"
                                        placeholder="Digite sua mensagem..."
                                    />

                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-zinc-400">{activeTemplateValue.length} caracteres</span>
                                        <button onClick={handleCopy} className="text-[11px] flex items-center gap-1 text-zinc-500 hover:text-zinc-800 transition-colors">
                                            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? 'Copiado!' : 'Copiar'}
                                        </button>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-3">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        Preview — com dados de exemplo
                                    </h3>
                                    <div className="bg-[#e5ddd5] rounded-xl p-4 min-h-[200px] flex flex-col items-end gap-2" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23e5ddd5'/%3E%3C/svg%3E\")" }}>
                                        <div className="max-w-[85%] bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm">
                                            <p
                                                className="text-sm text-zinc-800 leading-relaxed break-words"
                                                dangerouslySetInnerHTML={{
                                                    __html: formatarWhatsApp(substituirVariaveis(activeTemplateValue))
                                                }}
                                            />
                                            <p className="text-[10px] text-zinc-400 text-right mt-1">14:30 ✓✓</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Dados de exemplo usados:</p>
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

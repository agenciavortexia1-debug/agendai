import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, Save, Loader2, CreditCard, CheckCircle2, AlertCircle,
    DollarSign, Clock, Key, ToggleLeft, ToggleRight, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function PaymentConfig({ session }: { session: Session }) {
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);

    // Config
    const [pagamentoHabilitado, setPagamentoHabilitado] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [modoCobranca, setModoCobranca] = useState<'total' | 'sinal'>('total');
    const [sinalTipo, setSinalTipo] = useState<'percent' | 'fixed'>('percent');
    const [sinalValor, setSinalValor] = useState('');
    const [expiracaoMin, setExpiracaoMin] = useState('60');

    useEffect(() => {
        loadConfig();
    }, [session]);

    async function loadConfig() {
        setLoading(true);
        const { data } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (data) {
            setBusinessId(data.id);
            setPagamentoHabilitado(data.pagamento_habilitado || false);
            setApiKey(data.abacatepay_api_key || '');
            setModoCobranca(data.modo_cobranca || 'total');
            setSinalTipo(data.sinal_tipo || 'percent');
            setSinalValor(data.sinal_valor !== null && data.sinal_valor !== undefined ? String(data.sinal_valor) : '');
            setExpiracaoMin(data.pagamento_expiracao_min !== undefined ? String(data.pagamento_expiracao_min) : '60');
        }
        setLoading(false);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!businessId) return;
        setSaving(true);
        setSaveMsg(null);
        try {
            const { error } = await supabase
                .from('businesses')
                .update({
                    pagamento_habilitado: pagamentoHabilitado,
                    abacatepay_api_key: apiKey || null,
                    modo_cobranca: modoCobranca,
                    sinal_tipo: modoCobranca === 'sinal' ? sinalTipo : null,
                    sinal_valor: modoCobranca === 'sinal' && sinalValor ? parseFloat(sinalValor) : null,
                    pagamento_expiracao_min: expiracaoMin ? parseInt(expiracaoMin) : 60,
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

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-zinc-50">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-zinc-50">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
                {/* Header */}
                <header className="flex-shrink-0 bg-white border-b border-zinc-100 px-4 md:px-6 h-14 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link to="/dashboard" className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-sm font-sans font-bold text-zinc-900 leading-tight">Pagamento PIX</h1>
                            <p className="text-[10px] text-zinc-400 leading-tight hidden sm:block">Integração AbacatePay</p>
                        </div>
                    </div>
                    <button
                        type="submit"
                        form="payment-form"
                        disabled={saving}
                        className="flex items-center gap-1.5 bg-zinc-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-black transition-all text-xs disabled:opacity-70"
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{saving ? 'Salvando...' : 'Salvar'}</span>
                    </button>
                </header>

                {saveMsg && (
                    <div className={`mx-4 mt-2 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${saveMsg.startsWith('Erro') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        {saveMsg.startsWith('Erro') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        {saveMsg}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <form id="payment-form" onSubmit={handleSave} className="max-w-xl space-y-4">

                        {/* Ativar/Desativar */}
                        <div className="bg-white rounded-xl p-5 border border-zinc-200">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <p className="text-sm font-semibold text-zinc-900">Habilitar Pagamento PIX</p>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">Clientes pagarão via PIX antes de confirmar o agendamento.</p>
                                </div>
                                <div
                                    onClick={() => setPagamentoHabilitado(!pagamentoHabilitado)}
                                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ml-4 ${pagamentoHabilitado ? 'bg-emerald-500' : 'bg-zinc-200'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${pagamentoHabilitado ? 'left-7' : 'left-1'}`} />
                                </div>
                            </label>
                        </div>

                        {/* API Key AbacatePay */}
                        <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-3">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Key className="w-3.5 h-3.5" /> Credenciais AbacatePay
                            </h3>
                            <p className="text-[11px] text-zinc-400">
                                Crie sua conta em{' '}
                                <a href="https://abacatepay.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">abacatepay.com</a>
                                {' '}e cole sua API Key abaixo. Os pagamentos caem direto na sua conta.
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">API Key</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-10 pr-16 text-sm focus:ring-2 focus:ring-primary transition-all"
                                        placeholder="abacate_live_..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-zinc-700 font-medium"
                                    >
                                        {showKey ? 'Ocultar' : 'Mostrar'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modo de cobrança */}
                        <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-4">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <DollarSign className="w-3.5 h-3.5" /> Modo de Cobrança
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <label className={`flex flex-col gap-1.5 p-3 border rounded-xl cursor-pointer transition-all ${modoCobranca === 'total' ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'}`}>
                                    <input type="radio" name="modo" value="total" checked={modoCobranca === 'total'} onChange={() => setModoCobranca('total')} className="sr-only" />
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${modoCobranca === 'total' ? 'border-zinc-900' : 'border-zinc-300'}`}>
                                            {modoCobranca === 'total' && <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />}
                                        </div>
                                        <span className="text-sm font-semibold text-zinc-900">Total</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500">Cobra o valor integral do serviço.</p>
                                </label>
                                <label className={`flex flex-col gap-1.5 p-3 border rounded-xl cursor-pointer transition-all ${modoCobranca === 'sinal' ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'}`}>
                                    <input type="radio" name="modo" value="sinal" checked={modoCobranca === 'sinal'} onChange={() => setModoCobranca('sinal')} className="sr-only" />
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${modoCobranca === 'sinal' ? 'border-zinc-900' : 'border-zinc-300'}`}>
                                            {modoCobranca === 'sinal' && <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />}
                                        </div>
                                        <span className="text-sm font-semibold text-zinc-900">Sinal</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500">Cobra entrada/sinal parcial.</p>
                                </label>
                            </div>

                            {modoCobranca === 'sinal' && (
                                <div className="space-y-3 pt-1">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tipo do Sinal</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSinalTipo('percent')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${sinalTipo === 'percent' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'}`}
                                            >
                                                Percentual (%)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSinalTipo('fixed')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${sinalTipo === 'fixed' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'}`}
                                            >
                                                Valor Fixo (R$)
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                            {sinalTipo === 'percent' ? 'Percentual (%)' : 'Valor em R$'}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">
                                                {sinalTipo === 'percent' ? '%' : 'R$'}
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                step={sinalTipo === 'percent' ? '1' : '0.01'}
                                                max={sinalTipo === 'percent' ? '100' : undefined}
                                                value={sinalValor}
                                                onChange={e => setSinalValor(e.target.value)}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                                                placeholder={sinalTipo === 'percent' ? '30' : '50.00'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Expiração do PIX */}
                        <div className="bg-white rounded-xl p-5 border border-zinc-200 space-y-3">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" /> Expiração do PIX
                            </h3>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Minutos para expirar</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                    <input
                                        type="number"
                                        min="5"
                                        max="1440"
                                        value={expiracaoMin}
                                        onChange={e => setExpiracaoMin(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                                        placeholder="60"
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-400">Se o PIX não for pago neste tempo, o horário volta a ficar disponível automaticamente.</p>
                            </div>
                        </div>

                        {/* Aviso importante */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-blue-800">Cada negócio usa sua própria conta</p>
                                <p className="text-[11px] text-blue-600 mt-0.5">O sistema nunca toca no dinheiro. Cada pagamento vai direto para sua conta AbacatePay, sem intermediação.</p>
                            </div>
                        </div>

                    </form>
                </div>
            </main>
        </div>
    );
}

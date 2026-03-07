import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, Loader2 } from 'lucide-react';

export default function CheckoutPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const startCheckout = async () => {
            try {
                // Verificar se ja tem sessao ativa
                const { data: { session } } = await supabase.auth.getSession();

                setStatus('redirecting');

                // Chamar a API - com token se logado, sem token se usuario novo
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };
                if (session?.access_token) {
                    headers['token'] = session.access_token;
                }

                const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers,
                });

                const data = await response.json();

                if (data.error) throw new Error(data.error);
                if (data?.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error('Link de pagamento nao recebido.');
                }
            } catch (err: any) {
                setStatus('error');
                setErrorMsg(err.message || 'Erro desconhecido.');
            }
        };

        startCheckout();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-xl p-12 shadow-xl border border-zinc-100 text-center max-w-md w-full">
                <div className="w-14 h-14 bg-primary rounded-lg flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
                    <Calendar className="text-white w-7 h-7" />
                </div>

                {status === 'loading' && (
                    <>
                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-display font-bold text-zinc-900 mb-2">Preparando seu checkout...</h2>
                        <p className="text-zinc-500 text-sm">Verificando sua conta.</p>
                    </>
                )}

                {status === 'redirecting' && (
                    <>
                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-display font-bold text-zinc-900 mb-2">Redirecionando para o Stripe...</h2>
                        <p className="text-zinc-500 text-sm">Você será levado para a página de pagamento seguro em instantes.</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <h2 className="text-xl font-display font-bold text-zinc-900 mb-2">Algo deu errado</h2>
                        <p className="text-zinc-500 text-sm mb-6">{errorMsg}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-primary text-white px-6 py-3 rounded-lg font-sans font-semibold hover:bg-zinc-800 transition-all"
                        >
                            Voltar ao início
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

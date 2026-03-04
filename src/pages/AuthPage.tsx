import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Calendar, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Se vier de /auth?signup=true (pos-pagamento), inicia direto no modo cadastro
  const isPostPayment = searchParams.get('signup') === 'true';
  const sessionId = searchParams.get('session_id') || '';

  const [isLogin, setIsLogin] = useState(!isPostPayment);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Tenta buscar o email usado no Stripe para pre-preencher o campo
  useEffect(() => {
    if (isPostPayment && sessionId) {
      fetch(`/api/get-checkout-email?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.email) setEmail(data.email);
        })
        .catch(() => { }); // silencioso se falhar
    }
  }, [isPostPayment, sessionId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess(true);
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setError('Erro de conexao com o Supabase. Verifique as credenciais.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const titleText = isPostPayment
    ? 'Crie sua senha'
    : isLogin
      ? 'Bem-vindo de volta'
      : 'Crie sua conta';

  const subtitleText = isPostPayment
    ? 'Pagamento confirmado! Agora so falta criar sua senha para acessar.'
    : isLogin
      ? 'Acesse sua agenda profissional'
      : 'Comece a organizar seu tempo hoje';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 transition-all duration-300 bg-zinc-50">
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl p-10 shadow-xl border border-zinc-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/10">
            <Calendar className="text-white w-6 h-6" />
          </div>
          <h2 className="text-3xl font-sans font-semibold text-zinc-900 text-center">
            {titleText}
          </h2>
          <p className={`text-sm mt-2 text-center max-w-xs ${isPostPayment ? 'text-emerald-600 font-medium' : 'text-zinc-500'}`}>
            {subtitleText}
          </p>
        </div>

        {success ? (
          <div className="bg-emerald-50 text-emerald-700 p-6 rounded-xl text-center border border-emerald-100">
            <p className="font-sans font-semibold">Conta criada com sucesso!</p>
            <p className="text-sm mt-1">Verifique seu e-mail para confirmar o cadastro e depois faca o login.</p>
            <button
              onClick={() => { setIsLogin(true); setSuccess(false); }}
              className="mt-4 text-emerald-800 font-sans font-semibold underline"
            >
              Fazer Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all text-zinc-900"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all text-zinc-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-xl font-sans font-semibold hover:bg-zinc-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Entrar' : 'Criar Conta')}
            </button>

            {/* Nao mostrar opcao de trocar para login quando vier do pos-pagamento */}
            {!isPostPayment && (
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-zinc-400 hover:text-zinc-900 transition-colors font-medium"
                >
                  {isLogin ? 'Nao tem uma conta? Cadastre-se' : 'Ja tem uma conta? Entre'}
                </button>
              </div>
            )}
          </form>
        )}
      </motion.div>
    </div>
  );
}

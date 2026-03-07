import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Loader2, ArrowRight, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface ClientBookingAuthProps {
  onSuccess: (userId: string, name: string, email: string) => void;
  onBack: () => void;
  initialEmail?: string;
  initialName?: string;
  session?: any;
}

export default function ClientBookingAuth({ onSuccess, onBack, initialEmail = '', initialName = '', session }: ClientBookingAuthProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Generate a pseudo-email from the name to satisfy Supabase Auth
    // We use a consistent suffix to identify these "simple" accounts
    const pseudoEmail = `${name.toLowerCase().replace(/\s+/g, '.')}@cliente.agendai.app`;

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: pseudoEmail,
          password
        });
        if (error) {
          if (error.message === 'Invalid login credentials') {
            throw new Error('Nome ou senha incorretos.');
          }
          if (error.message.includes('rate limit')) {
            throw new Error('Muitas tentativas. Aguarde um momento ou verifique as configurações do Supabase.');
          }
          throw error;
        }

        onSuccess(data.user.id, name, data.user.email || '');
      } else {
        if (name.length < 3) throw new Error('O nome deve ter pelo menos 3 caracteres.');

        const { data, error } = await supabase.auth.signUp({
          email: pseudoEmail,
          password,
          options: {
            data: {
              full_name: name
            }
          }
        });
        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('Este nome já está sendo usado. Tente outro ou faça login.');
          }
          if (error.message.includes('rate limit')) {
            throw new Error('Limite de cadastros atingido. Por favor, desative a "Confirmação de E-mail" no seu painel do Supabase (Auth -> Settings).');
          }
          throw error;
        }
        if (!data.user) throw new Error('Erro ao criar conta');

        onSuccess(data.user.id, name, pseudoEmail);
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setError('Erro de conexão. Verifique sua internet.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[32px] p-6 md:p-10 shadow-xl border border-black/5"
    >


      <div className="text-center mb-8">
        <h2 className="text-2xl font-sans font-semibold mb-2">
          {session ? `Olá, ${session.user.user_metadata?.full_name || session.user.email}` : (isLogin ? 'Acesse sua conta' : 'Crie sua conta')}
        </h2>
        <p className="text-black/40 text-sm">
          {session
            ? 'Você já está conectado. Deseja continuar com esta conta?'
            : (isLogin ? 'Entre para gerenciar seus agendamentos' : 'Cadastre-se para agendar e poder remarcar depois')}
        </p>
      </div>

      {session ? (
        <div className="space-y-4 text-center">
          <button
            onClick={() => onSuccess(session.user.id, session.user.user_metadata?.full_name || '', session.user.email || '')}
            className="w-full bg-[var(--primary-color)] text-white py-4 rounded-2xl font-sans font-semibold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            Confirmar e Continuar
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-8 text-[10px] font-sans font-medium uppercase tracking-widest text-black/20 px-4">
            Se você for o dono do link, clique em "Confirmar" para testar ou ignore esta tela.
          </p>
        </div>
      ) : (
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-sans font-medium uppercase tracking-widest text-black/40 ml-1">Seu Nome</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#f5f5f0] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                placeholder="Digite seu nome"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-sans font-medium uppercase tracking-widest text-black/40 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f5f5f0] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                placeholder="Crie uma senha"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-xs text-center bg-red-50 p-3 rounded-xl border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--primary-color)] text-white py-4 rounded-2xl font-sans font-semibold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {isLogin ? 'Entrar' : 'Criar conta e continuar'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-black/40 hover:text-black transition-colors"
            >
              {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}

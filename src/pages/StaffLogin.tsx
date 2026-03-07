import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, Loader2, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

export default function StaffLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error: fetchError } = await supabase
                .from('professionals')
                .select('*, businesses(slug, name)')
                .eq('login_user', username)
                .eq('login_pass', password)
                .single();

            if (fetchError || !data) {
                throw new Error('Usuário ou senha incorretos.');
            }

            // Store staff session
            localStorage.setItem('staff_session', JSON.stringify({
                id: data.id,
                name: data.name,
                role: data.role,
                business_id: data.business_id,
                business_slug: data.businesses?.slug,
                access_screens: data.access_screens || ['agenda']
            }));

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-zinc-200 overflow-hidden"
            >
                <div className="p-8 md:p-12">
                    <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-lg rotate-3">
                        <Smartphone className="w-8 h-8 text-white" />
                    </div>

                    <div className="text-center mb-10">
                        <h1 className="text-2xl font-display font-bold text-zinc-900">Área do Colaborador</h1>
                        <p className="text-zinc-500 text-sm mt-2 font-medium">Acesse sua agenda e horários</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Usuário</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                    placeholder="Seu usuário"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-red-500 text-sm font-semibold bg-red-50 p-3 rounded-xl border border-red-100 text-center"
                            >
                                {error}
                            </motion.p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 group disabled:opacity-70 active:scale-[0.98] mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    Entrar no Agendai
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="bg-zinc-50 p-6 border-t border-zinc-100 text-center">
                    <p className="text-xs text-zinc-400 font-medium">Caso tenha esquecido seus dados, solicite ao dono do negócio.</p>
                </div>
            </motion.div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Business, Appointment } from '../types';
import { motion } from 'motion/react';
import {
    TrendingUp,
    BarChart3,
    Activity,
    ArrowLeft,
    Users,
    Clock,
    Calendar as CalendarIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Sidebar from '../components/Sidebar';
import { cn } from '../lib/utils';

export default function Analytics({ session }: { session: Session }) {
    const [business, setBusiness] = useState<Business | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const { data: businessData } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();

                if (businessData) {
                    setBusiness(businessData);
                    const { data: appData } = await supabase
                        .from('appointments')
                        .select('*')
                        .eq('business_id', businessData.id)
                        .order('start_time', { ascending: true });

                    if (appData) setAppointments(appData);
                }
            } catch (err) {
                console.error('Error loading analytics data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [session]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!business) return null;

    const activeApps = appointments.filter(app => app.status !== 'cancelled');

    // Calcular dia de pico
    const dayCounts: Record<string, number> = {};
    activeApps.forEach(app => {
        const day = format(parseISO(app.start_time), 'EEEE', { locale: ptBR });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Calcular horário de pico
    const hourCounts: Record<string, number> = {};
    activeApps.forEach(app => {
        const hour = format(parseISO(app.start_time), 'HH:00');
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const chartData = Array.from({ length: 12 }).map((_, i) => {
        const hour = `${i + 8}:00`;
        return hourCounts[hour] || 0;
    });
    const maxVal = Math.max(...chartData, 1);

    return (
        <div className="min-h-screen flex flex-col md:flex-row transition-all duration-300 bg-zinc-50/50">
            <Sidebar />

            <main className="flex-1 p-6 md:p-10 overflow-y-auto pb-24 md:pb-10">
                <header className="mb-8 md:mb-10">
                    <Link to="/dashboard" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-6 font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para Agenda
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-zinc-900">Análises de Desempenho</h1>
                    <p className="text-zinc-500 mt-1">Acompanhe o crescimento e a eficiência do seu negócio.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Total de Agendamentos</p>
                        <h3 className="text-2xl font-display font-bold text-zinc-900 mt-1">{appointments.length}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Agendamentos Ativos</p>
                        <h3 className="text-2xl font-display font-bold text-zinc-900 mt-1">{activeApps.length}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                                <Activity className="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                        <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Taxa de Ocupação</p>
                        <h3 className="text-2xl font-display font-bold text-zinc-900 mt-1">
                            {appointments.length > 0 ? Math.round((activeApps.length / appointments.length) * 100) : 0}%
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm overflow-hidden relative group">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-sans font-semibold text-zinc-900">Desempenho Operacional</h3>
                                <p className="text-sm text-zinc-400">Visão geral do seu negócio</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                        <div className="space-y-1">
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Total Ativos</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-display font-bold text-zinc-900">{activeApps.length}</span>
                                <span className="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
                                    <TrendingUp className="w-3 h-3" /> 12%
                                </span>
                            </div>
                        </div>
                        <div className="space-y-1 border-y md:border-y-0 md:border-x border-zinc-100 py-4 md:py-0 md:px-8">
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Dia de Pico</p>
                            <span className="text-xl font-sans font-semibold text-zinc-900 capitalize">{peakDay}</span>
                        </div>
                        <div className="space-y-1 md:pl-4">
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Horário de Pico</p>
                            <span className="text-xl font-sans font-semibold text-zinc-900">{peakHour}</span>
                        </div>
                    </div>

                    <div className="relative pt-10 border-t border-zinc-50">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-sans font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                                <BarChart3 className="w-3 h-3 text-indigo-400" />
                                Fluxo de Horários (Hoje)
                            </h4>
                        </div>
                        <div className="h-48 w-full flex items-end gap-2 px-2">
                            {chartData.map((val, i) => (
                                <div
                                    key={i}
                                    className="flex-1 bg-indigo-50 rounded-t-lg relative group/bar hover:bg-indigo-100 transition-colors"
                                    style={{ height: `${(val / maxVal) * 100}%` }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                        {val} agend. às {i + 8}:00
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-4 text-xs font-sans font-medium text-zinc-400 px-1">
                            <span>08:00</span>
                            <span>10:00</span>
                            <span>12:00</span>
                            <span>14:00</span>
                            <span>16:00</span>
                            <span>18:00</span>
                            <span>20:00</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

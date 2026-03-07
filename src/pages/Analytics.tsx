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
    Calendar as CalendarIcon,
    Award,
    Scissors
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO, subDays, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Sidebar from '../components/Sidebar';

export default function Analytics({ session }: { session: Session }) {
    const [business, setBusiness] = useState<Business | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        from: subDays(new Date(), 30),
        to: new Date()
    });

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
                        .select(`
                            *,
                            service:services (name, price),
                            professional:professionals (name)
                        `)
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

    // Todos os filtros aplicados ao mesmo dateRange
    const filteredApps = appointments.filter(app => {
        if (app.status === 'cancelled') return false;
        const appDate = parseISO(app.start_time);
        return isWithinInterval(appDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to)
        });
    });

    const allFilteredApps = appointments.filter(app => {
        const appDate = parseISO(app.start_time);
        return isWithinInterval(appDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to)
        });
    });

    const occupancyRate = allFilteredApps.length > 0
        ? Math.round((filteredApps.length / allFilteredApps.length) * 100)
        : 0;

    // Calcular dia de pico
    const dayCounts: Record<string, number> = {};
    filteredApps.forEach(app => {
        const day = format(parseISO(app.start_time), 'EEEE', { locale: ptBR });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Calcular horário de pico
    const hourCounts: Record<string, number> = {};
    filteredApps.forEach(app => {
        const hour = format(parseISO(app.start_time), 'HH:00');
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const chartData = Array.from({ length: 12 }).map((_, i) => {
        const hour = `${i + 8}:00`;
        return hourCounts[hour] || 0;
    });
    const maxVal = Math.max(...chartData, 1);

    // Evolução diária
    const trendCounts: Record<string, number> = {};
    filteredApps.forEach(app => {
        const day = format(parseISO(app.start_time), 'dd/MM');
        trendCounts[day] = (trendCounts[day] || 0) + 1;
    });
    const daysInRange = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const trendData = daysInRange.map(day => {
        const formatDay = format(day, 'dd/MM');
        return {
            label: formatDay,
            value: trendCounts[formatDay] || 0
        };
    });
    const maxTrendVal = Math.max(...trendData.map(d => d.value), 1);

    // Performance de Colaboradores
    const professionalCounts: Record<string, number> = {};
    filteredApps.forEach(app => {
        if (app.professional?.name) {
            professionalCounts[app.professional.name] = (professionalCounts[app.professional.name] || 0) + 1;
        }
    });
    const professionalData = Object.entries(professionalCounts)
        .sort((a, b) => b[1] - a[1]) // Descending
        .slice(0, 5) // Top 5
        .map(([name, count]) => ({ name, count }));
    const maxProfVal = Math.max(...professionalData.map(d => d.count), 1);

    // Serviços mais realizados
    const serviceCounts: Record<string, number> = {};
    filteredApps.forEach(app => {
        if (app.service?.name) {
            serviceCounts[app.service.name] = (serviceCounts[app.service.name] || 0) + 1;
        }
    });
    const serviceData = Object.entries(serviceCounts)
        .sort((a, b) => b[1] - a[1]) // Descending
        .slice(0, 5) // Top 5
        .map(([name, count]) => ({ name, count }));
    const maxServiceVal = Math.max(...serviceData.map(d => d.count), 1);

    // Taxa de Comparecimento vs Falta
    let attendedCount = 0;
    let missedCount = 0;
    filteredApps.forEach(app => {
        if (app.attended === true) attendedCount++;
        if (app.attended === false) missedCount++;
    });
    const totalAttendanceTracked = attendedCount + missedCount;
    const attendanceRate = totalAttendanceTracked > 0 ? Math.round((attendedCount / totalAttendanceTracked) * 100) : 0;
    const missingRate = totalAttendanceTracked > 0 ? Math.round((missedCount / totalAttendanceTracked) * 100) : 0;

    // Faturamento Total no Período
    const totalRevenue = filteredApps.reduce((acc, app) => {
        if (app.attended === true && app.final_price) {
            return acc + Number(app.final_price);
        }
        return acc;
    }, 0);

    return (
        <div className="min-h-screen flex flex-col md:flex-row transition-all duration-300 bg-zinc-50/50">
            <Sidebar />

            <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-24 md:pb-10">
                <header className="mb-6 md:mb-8">
                    <Link to="/dashboard" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-4 font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para Agenda
                    </Link>
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-display font-bold text-zinc-900">Análises de Desempenho</h1>
                            <p className="text-zinc-500 mt-1 text-sm">Acompanhe o crescimento e a eficiência do seu negócio.</p>
                        </div>
                        {/* Filtro de data no topo, afeta todos os indicadores */}
                        <div className="flex items-center gap-2 bg-white border border-zinc-200 p-2.5 rounded-lg shadow-sm self-start sm:self-auto">
                            <CalendarIcon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                            <input
                                type="date"
                                className="bg-transparent border-none text-sm font-medium text-zinc-700 focus:outline-none w-full sm:w-auto"
                                value={format(dateRange.from, 'yyyy-MM-dd')}
                                onChange={(e) => {
                                    if (!e.target.value) return;
                                    setDateRange(prev => ({ ...prev, from: parseISO(e.target.value) }));
                                }}
                            />
                            <span className="text-zinc-300">→</span>
                            <input
                                type="date"
                                className="bg-transparent border-none text-sm font-medium text-zinc-700 focus:outline-none w-full sm:w-auto"
                                value={format(dateRange.to, 'yyyy-MM-dd')}
                                onChange={(e) => {
                                    if (!e.target.value) return;
                                    setDateRange(prev => ({ ...prev, to: parseISO(e.target.value) }));
                                }}
                            />
                        </div>
                    </div>
                </header>

                {/* KPI Cards — todos respondem ao filtro de data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm"
                    >
                        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
                            <span className="text-emerald-600 font-bold">R$</span>
                        </div>
                        <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Faturamento Período</p>
                        <h3 className="text-2xl font-display font-bold text-zinc-900 mt-1">
                            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm"
                    >
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Total Agendados</p>
                        <h3 className="text-2xl font-display font-bold text-zinc-900 mt-1">{allFilteredApps.length}</h3>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm"
                    >
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mb-3">
                            <Clock className="w-5 h-5 text-indigo-600" />
                        </div>
                        <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Agendamentos Úteis</p>
                        <h3 className="text-2xl font-display font-bold text-zinc-900 mt-1">{filteredApps.length}</h3>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm"
                    >
                        <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
                            <Activity className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Taxa de Conclusão</p>
                        <h3 className="text-2xl font-display font-bold text-zinc-900 mt-1">{attendanceRate}%</h3>
                    </motion.div>
                </div>

                {/* Desempenho operacional */}
                <div className="bg-white p-5 md:p-8 rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-sans font-semibold text-zinc-900">Desempenho Operacional</h3>
                            <p className="text-xs text-zinc-400">Visão geral do seu negócio no período selecionado</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                        <div className="space-y-1">
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Total Ativos</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-display font-bold text-zinc-900">{filteredApps.length}</span>
                            </div>
                        </div>
                        <div className="space-y-1 border-y sm:border-y-0 sm:border-x border-zinc-100 py-4 sm:py-0 sm:px-8">
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Dia de Pico</p>
                            <span className="text-xl font-sans font-semibold text-zinc-900 capitalize">{peakDay}</span>
                        </div>
                        <div className="space-y-1 sm:pl-4">
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Horário de Pico</p>
                            <span className="text-xl font-sans font-semibold text-zinc-900">{peakHour}</span>
                        </div>
                    </div>

                    {/* Gráfico de fluxo por hora */}
                    <div className="relative pt-8 border-t border-zinc-50">
                        <h4 className="text-xs font-sans font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <BarChart3 className="w-3 h-3 text-indigo-400" />
                            Fluxo de Horários (No Período)
                        </h4>
                        <div className="overflow-x-auto">
                            <div className="h-40 w-full min-w-[320px] flex items-end gap-1.5 px-2">
                                {chartData.map((val, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 bg-primary/30 rounded-t-sm relative group/bar hover:bg-primary transition-colors min-w-[16px]"
                                        style={{ height: `${(val / maxVal) * 100}%`, minHeight: val > 0 ? '4px' : '0' }}
                                    >
                                        {val > 0 && (
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                                {val} agend. às {i + 8}:00
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-between mt-3 text-xs font-sans font-medium text-zinc-400 px-1">
                            <span>08:00</span>
                            <span>11:00</span>
                            <span>14:00</span>
                            <span>17:00</span>
                            <span>19:00</span>
                        </div>
                    </div>

                    {/* Gráfico de evolução diária */}
                    <div className="relative pt-8 border-t border-zinc-50 mt-8">
                        <h4 className="text-xs font-sans font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <Activity className="w-3 h-3 text-emerald-400" />
                            Evolução de Agendamentos (Por Dia)
                        </h4>
                        <div className="overflow-x-auto">
                            <div className="h-40 w-full min-w-[320px] flex items-end gap-0.5 px-2">
                                {trendData.map((d, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 bg-primary/30 rounded-t-sm relative group/bar hover:bg-primary transition-colors min-w-[4px]"
                                        style={{ height: `${(d.value / maxTrendVal) * 100}%`, minHeight: d.value > 0 ? '4px' : '0' }}
                                    >
                                        {d.value > 0 && (
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                                {d.value} em {d.label}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-between mt-3 text-[10px] font-sans font-medium text-zinc-400 px-1 overflow-hidden">
                            <span>{trendData[0]?.label}</span>
                            <span>{trendData[Math.floor(trendData.length / 2)]?.label}</span>
                            <span>{trendData[trendData.length - 1]?.label}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                        {/* Performance de Colaboradores */}
                        <div className="bg-white p-5 md:p-6 rounded-xl border border-zinc-200 shadow-sm">
                            <h4 className="text-sm font-sans font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                                <Award className="w-4 h-4 text-amber-500" />
                                Top Colaboradores (Qtd)
                            </h4>
                            {professionalData.length === 0 ? (
                                <p className="text-sm text-zinc-400 italic text-center py-6">Nenhum dado no período.</p>
                            ) : (
                                <div className="space-y-4">
                                    {professionalData.map((prof, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-8 flex-shrink-0 text-center text-xs font-bold text-zinc-400">
                                                #{i + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-end mb-1">
                                                    <span className="text-sm font-semibold text-zinc-800 truncate block max-w-[150px]">{prof.name}</span>
                                                    <span className="text-xs font-bold text-zinc-500">{prof.count}</span>
                                                </div>
                                                <div className="w-full bg-zinc-100 rounded-full h-2">
                                                    <div
                                                        className="bg-amber-400 h-2 rounded-full"
                                                        style={{ width: `${(prof.count / maxProfVal) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Serviços Mais Realizados */}
                        <div className="bg-white p-5 md:p-6 rounded-xl border border-zinc-200 shadow-sm">
                            <h4 className="text-sm font-sans font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                                <Scissors className="w-4 h-4 text-emerald-500" />
                                Serviços Mais Populares
                            </h4>
                            {serviceData.length === 0 ? (
                                <p className="text-sm text-zinc-400 italic text-center py-6">Nenhum dado no período.</p>
                            ) : (
                                <div className="space-y-4">
                                    {serviceData.map((svc, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-8 flex-shrink-0 text-center text-xs font-bold text-zinc-400">
                                                #{i + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-end mb-1">
                                                    <span className="text-sm font-semibold text-zinc-800 truncate block max-w-[150px]">{svc.name}</span>
                                                    <span className="text-xs font-bold text-zinc-500">{svc.count}</span>
                                                </div>
                                                <div className="w-full bg-zinc-100 rounded-full h-2">
                                                    <div
                                                        className="bg-emerald-400 h-2 rounded-full"
                                                        style={{ width: `${(svc.count / maxServiceVal) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

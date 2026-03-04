import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Business, Appointment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Settings,
  Clock,
  LogOut,
  ExternalLink,
  Plus,
  Users,
  ChevronRight,
  X,
  Phone,
  Mail,
  FileText,
  Bell,
  Scissors,
  RefreshCw,
  CalendarX,
  Loader2,
  TrendingUp,
  BarChart3,
  Activity
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Sidebar from '../components/Sidebar';
import { cn } from '../lib/utils';

export default function Dashboard({ session }: { session: Session }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      // Load business
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (businessData) {
        setBusiness(businessData);

        // Load appointments initial data
        const loadAppointments = async () => {
          const { data: appData } = await supabase
            .from('appointments')
            .select('*')
            .eq('business_id', businessData.id)
            .order('start_time', { ascending: true });

          if (appData) setAppointments(appData);
        };

        await loadAppointments();

        // Supabase Realtime: Listen for new, updated or deleted appointments
        const channel = supabase
          .channel('appointments_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'appointments',
              filter: `business_id=eq.${businessData.id}`
            },
            () => {
              loadAppointments(); // Reload on any change
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
      setLoading(false);
    }

    loadData();
  }, [session]);

  // Paywall: Retirado o redirecionamento automático
  // O dashboard já possui UI de "bloqueio" e botões para assinar manualmente,
  // permitindo que o usuário interaja caso o webhook atrase.

  const filteredAppointments = appointments.filter(app =>
    isSameDay(parseISO(app.start_time), selectedDate) && app.status !== 'cancelled'
  );

  const recentActivity = [...appointments]
    .sort((a, b) => {
      const dateA = a.updated_at || a.created_at;
      const dateB = b.updated_at || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .slice(0, 5);

  const nextAppointment = appointments
    .filter(app => app.status !== 'cancelled')
    .find(app => parseISO(app.start_time) >= new Date());

  // --- Analíticos ---
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

  // Dados para o mini-gráfico (últimos 7 dias ou volume por hora hoje)
  const chartData = Array.from({ length: 12 }).map((_, i) => {
    const hour = `${i + 8}:00`;
    return hourCounts[hour] || Math.floor(Math.random() * 3); // Simulação básica se estiver vazio para o visual
  });
  const maxVal = Math.max(...chartData, 1);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isSuccess = new URLSearchParams(window.location.search).get('success') === 'true';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-xl shadow-md max-w-md text-center border border-zinc-200"
        >
          <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Plus className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-sans font-semibold mb-4 text-zinc-900">Configure seu negócio</h2>
          <p className="text-zinc-500 mb-8 font-sans">Para começar a receber agendamentos, precisamos de algumas informações básicas sobre sua empresa.</p>
          <Link
            to="/dashboard/settings"
            className="block w-full bg-primary text-white py-4 rounded-xl font-sans font-semibold hover:bg-zinc-800 transition-all shadow-lg text-center"
          >
            Começar Configuração
          </Link>
        </motion.div>
      </div>
    );
  }

  const isSubscriptionActive = ['active', 'trialing'].includes(business.subscription_status || '');
  const isSubscriptionProblematic = ['canceled', 'past_due', 'incomplete_expired'].includes(business.subscription_status || '');

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) throw new Error('Sessão não encontrada');

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': currentSession.access_token,
        },
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert('Erro ao iniciar checkout: ' + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-all duration-300">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 overflow-y-auto pb-24 md:pb-10 bg-zinc-50/50">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold capitalize text-zinc-900">Olá, {business.name}</h1>
            <p className="text-zinc-500 mt-1 text-sm md:text-base capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="w-full md:w-auto">
            <a
              href={`/b/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-white px-6 py-3 rounded-xl border border-zinc-200 font-sans font-semibold text-zinc-900 hover:bg-zinc-50 transition-all shadow-sm w-full md:w-auto"
            >
              <ExternalLink className="w-4 h-4" />
              Ver Link Público
            </a>
          </div>
        </header>

        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-emerald-900 font-sans font-semibold">Pagamento processado!</h3>
              <p className="text-emerald-700 text-sm">Sua assinatura está sendo ativada. Pode levar alguns segundos para atualizar.</p>
            </div>
          </motion.div>
        )}

        {isSubscriptionProblematic && (
          <div className="mb-10 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-sans font-semibold text-amber-900">Assinatura Expirada ou Inativa</h3>
                <p className="text-amber-700 text-sm">Seu acesso aos agendamentos e estatísticas está limitado. Regularize sua assinatura para continuar.</p>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="whitespace-nowrap bg-amber-600 text-white px-8 py-3 rounded-xl font-sans font-semibold hover:bg-amber-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-70"
            >
              {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assinar Plano Pro'}
            </button>
          </div>
        )}

        <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-8", isSubscriptionProblematic && "opacity-50 pointer-events-none")}>
          {/* Stats & List */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <button
                onClick={() => setShowAllAppointments(true)}
                className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm text-left hover:bg-zinc-50 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                </div>
                <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Total de Agendamentos</p>
                <h3 className="text-2xl font-display font-bold text-zinc-900 mt-1">{appointments.length}</h3>
              </button>

              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Próximo Agendamento</p>
                <h3 className="text-base font-display font-bold text-zinc-900 mt-1">
                  {nextAppointment
                    ? format(parseISO(nextAppointment.start_time), "dd/MM, HH:mm", { locale: ptBR })
                    : "Nenhum agendado"}
                </h3>
              </div>

              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-amber-600" />
                  </div>
                  {recentActivity.length > 0 && (
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  )}
                </div>
                <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Atividade Recente</p>
                <div className="mt-1 space-y-1">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 1).map(activity => (
                      <div key={activity.id} className="text-xs truncate text-zinc-600">
                        <span className="font-sans font-semibold text-primary">
                          {activity.status === 'cancelled' ? 'Cancelado: ' : (activity.updated_at ? 'Remarcado: ' : 'Novo: ')}
                        </span>
                        {activity.client_name}
                      </div>
                    ))
                  ) : (
                    <h3 className="text-base font-sans font-semibold text-zinc-900">Sem atividades</h3>
                  )}
                </div>
              </div>
            </div>

            {/* KPIs & Performance Section */}
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
                <Activity className="w-6 h-6 text-zinc-100 group-hover:text-indigo-100 transition-colors" />
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

              {/* Peak Hours Chart (SVG) */}
              <div className="relative pt-10 border-t border-zinc-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-sans font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-3 h-3 text-indigo-400" />
                    Fluxo de Horários (Hoje)
                  </h4>
                </div>
                <div className="h-24 w-full flex items-end gap-2 px-2">
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
                <div className="flex justify-between mt-2 text-[10px] font-sans font-medium text-zinc-300 px-1">
                  <span>08:00</span>
                  <span>14:00</span>
                  <span>20:00</span>
                </div>
              </div>
            </div>

            {/* Appointment List */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-sans font-semibold text-zinc-900">Compromissos</h3>
                  <p className="text-xs text-zinc-400 mt-1 capitalize">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="text-sm text-primary font-sans font-semibold hover:underline"
                >
                  Ir para hoje
                </button>
              </div>
              <div className="divide-y divide-zinc-100">
                {filteredAppointments.length === 0 ? (
                  <div className="p-12 text-center text-zinc-400 italic font-medium">
                    Nenhum agendamento para este dia.
                  </div>
                ) : (
                  filteredAppointments.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => setSelectedAppointment(app)}
                      className="w-full p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-50 rounded-xl flex flex-col items-center justify-center text-zinc-400 flex-shrink-0 border border-zinc-100 group-hover:bg-white group-hover:border-primary/20 transition-colors">
                          <span className="text-[10px] font-sans font-semibold uppercase">{format(parseISO(app.start_time), 'MMM', { locale: ptBR })}</span>
                          <span className="text-lg font-sans font-semibold leading-none text-zinc-900">{format(parseISO(app.start_time), 'dd')}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-sans font-semibold text-zinc-900 truncate">{app.client_name}</h4>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-zinc-500">{format(parseISO(app.start_time), 'HH:mm')} - {format(parseISO(app.end_time), 'HH:mm')}</p>
                            {app.service && (
                              <>
                                <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                                <span className="text-xs font-sans font-semibold text-primary uppercase tracking-wider">{app.service}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-sans font-semibold text-zinc-900">{app.client_phone}</p>
                          <p className="text-xs text-zinc-400">{app.client_email}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Calendar Mini View */}
          <div className="space-y-8">
            {/* Recent Activity Feed */}
            <div className="bg-white p-6 md:p-8 rounded-xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Bell className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-lg font-sans font-semibold text-zinc-900">Notificações</h3>
              </div>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <button
                      key={activity.id}
                      onClick={() => setSelectedAppointment(activity)}
                      className="w-full flex gap-3 items-start text-left hover:bg-black/[0.02] p-2 rounded-2xl transition-colors group"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform",
                        activity.status === 'cancelled' ? "bg-red-50" : (activity.updated_at ? "bg-blue-50" : "bg-emerald-50")
                      )}>
                        {activity.status === 'cancelled' ? (
                          <CalendarX className="w-4 h-4 text-red-500" />
                        ) : (activity.updated_at ? (
                          <RefreshCw className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Plus className="w-4 h-4 text-emerald-500" />
                        ))}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight text-zinc-900">
                          {activity.status === 'cancelled' ? (
                            <>Agendamento cancelado por <span className="font-sans font-semibold">{activity.client_name}</span></>
                          ) : (activity.updated_at ? (
                            <>Agendamento remarcado por <span className="font-sans font-semibold">{activity.client_name}</span></>
                          ) : (
                            <>Novo agendamento de <span className="font-sans font-semibold">{activity.client_name}</span></>
                          ))}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-1">
                          {format(parseISO(activity.updated_at || activity.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-black/30 italic text-center py-4">Nenhuma atividade recente.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-xl border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-sans font-semibold capitalize text-zinc-900">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-zinc-50 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180 text-zinc-400" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-zinc-50 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-sans font-medium text-zinc-300 mb-4">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {/* Padding days for the start of the month */}
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}

                {eachDayOfInterval({
                  start: startOfMonth(currentMonth),
                  end: endOfMonth(currentMonth)
                }).map((day, i) => {
                  const hasApp = appointments.some(app => isSameDay(parseISO(app.start_time), day));
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square rounded-lg flex items-center justify-center text-sm relative transition-all",
                        isSelected ? "bg-primary text-white shadow-md" : "hover:bg-zinc-50 text-zinc-600",
                        !isSelected && isToday && "border border-primary text-primary font-sans font-semibold"
                      )}
                    >
                      {format(day, 'd')}
                      {hasApp && !isSelected && (
                        <div className={cn(
                          "absolute bottom-1.5 w-1.5 h-1.5 rounded-full",
                          isToday ? "bg-white ring-1 ring-primary" : "bg-primary"
                        )}></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-primary p-8 rounded-xl text-white shadow-md relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="text-lg font-sans font-semibold mb-2">Compartilhe sua agenda</h4>
                <p className="text-white/60 text-sm mb-6 leading-relaxed">Envie seu link para clientes e receba agendamentos automaticamente.</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/b/${business.slug}`);
                    alert('Link copiado!');
                  }}
                  className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-xl font-sans font-semibold transition-all backdrop-blur-md border border-white/10"
                >
                  Copiar Link
                </button>
              </div>
              <CalendarIcon className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 rotate-12" />
            </div>
          </div>
        </div>
      </main>

      {/* Appointment Details Modal */}
      <AnimatePresence>
        {
          selectedAppointment && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedAppointment(null)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-lg rounded-xl shadow-2xl relative z-10 overflow-hidden"
              >
                <div className="p-8 md:p-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-primary/5 rounded-xl flex items-center justify-center">
                        <CalendarIcon className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-sans font-semibold text-zinc-900">{selectedAppointment.client_name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-zinc-500 text-sm">Detalhes do Agendamento</p>
                          {selectedAppointment.status === 'cancelled' && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-sans font-medium uppercase tracking-widest rounded-md">
                              Cancelado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedAppointment(null)}
                      className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6 text-zinc-400" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl">
                      <Clock className="w-5 h-5 text-zinc-400" />
                      <div>
                        <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Data e Horário</p>
                        <p className="font-medium text-zinc-900">
                          {format(parseISO(selectedAppointment.start_time), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-xl">
                        <Phone className="w-5 h-5 text-zinc-400" />
                        <div>
                          <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Telefone</p>
                          <p className="font-medium text-zinc-900">{selectedAppointment.client_phone}</p>
                        </div>
                      </div>
                      {selectedAppointment.service ? (
                        <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-xl">
                          <Scissors className="w-5 h-5 text-zinc-400" />
                          <div>
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Serviço</p>
                            <p className="font-medium text-zinc-900">{selectedAppointment.service}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-xl">
                          <Mail className="w-5 h-5 text-zinc-400" />
                          <div>
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">E-mail</p>
                            <p className="font-medium text-zinc-900 truncate max-w-[120px]">{selectedAppointment.client_email}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6 border border-zinc-100 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <FileText className="w-4 h-4" />
                        <span className="text-[10px] font-sans font-medium uppercase tracking-widest">Observações</span>
                      </div>
                      <p className="text-zinc-600 leading-relaxed italic">
                        {selectedAppointment.notes || "Nenhuma observação enviada pelo cliente."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-10 flex gap-4">
                    <button
                      onClick={() => setSelectedAppointment(null)}
                      className="flex-1 bg-primary text-white py-4 rounded-xl font-sans font-semibold hover:bg-zinc-800 transition-all shadow-lg"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >
      {/* All Appointments Modal */}
      <AnimatePresence>
        {
          showAllAppointments && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAllAppointments(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-2xl rounded-xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-sans font-semibold text-zinc-900">Todos os Agendamentos</h3>
                    <p className="text-zinc-500 text-sm">Histórico completo de clientes</p>
                  </div>
                  <button
                    onClick={() => setShowAllAppointments(false)}
                    className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-zinc-400" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                  <div className="divide-y divide-zinc-100">
                    {appointments.length === 0 ? (
                      <div className="p-12 text-center text-zinc-400 italic">
                        Nenhum agendamento encontrado.
                      </div>
                    ) : (
                      appointments.map((app) => (
                        <div
                          key={app.id}
                          className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors rounded-2xl"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-zinc-50 rounded-lg flex flex-col items-center justify-center text-primary flex-shrink-0 border border-zinc-100">
                              <span className="text-[8px] font-sans font-semibold uppercase">{format(parseISO(app.start_time), 'MMM', { locale: ptBR })}</span>
                              <span className="text-sm font-sans font-semibold leading-none">{format(parseISO(app.start_time), 'dd')}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-zinc-900">{app.client_name}</h4>
                                {app.status === 'cancelled' && (
                                  <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[8px] font-sans font-medium uppercase tracking-widest rounded-md">
                                    Cancelado
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500">
                                {format(parseISO(app.start_time), "dd/MM/yyyy 'às' HH:mm")}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedAppointment(app);
                              setShowAllAppointments(false);
                            }}
                            className="text-xs font-sans font-semibold text-primary hover:underline"
                          >
                            Ver Detalhes
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >
    </div >
  );
}

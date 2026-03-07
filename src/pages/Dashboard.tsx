import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Business, Appointment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
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
  Copy,
  Check,
  Maximize2,
  Minimize2,
  CheckCircle2,
  XCircle,
  DollarSign,
  Lock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Sidebar from '../components/Sidebar';
import { cn } from '../lib/utils';

export default function Dashboard({ session, staffSession }: { session?: any; staffSession?: any }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [calendarFullscreen, setCalendarFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedStaff, setCopiedStaff] = useState(false);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);
  const [attendanceFinalPrice, setAttendanceFinalPrice] = useState('');
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(localStorage.getItem('lastNotificationId_agendai'));
  const navigate = useNavigate();

  const loadAppointments = useCallback(async (businessId: string) => {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        service:services (name, price),
        professional:professionals (name)
      `)
      .eq('business_id', businessId)
      .order('start_time', { ascending: true });

    if (staffSession && staffSession.role !== 'owner') {
      query = query.eq('professional_id', staffSession.id);
    }

    const { data } = await query;
    if (data) setAppointments(data);
  }, [staffSession]);

  useEffect(() => {
    let channel: any;

    async function loadData() {
      try {
        setLoading(true);
        let bData = null;

        if (staffSession) {
          const { data, error } = await supabase.from('businesses').select('*').eq('id', staffSession.business_id).single();
          if (!error && data) {
            bData = data;
          } else {
            // Fallback for staff if RLS blocks the query
            bData = {
              id: staffSession.business_id,
              name: staffSession.business_name || 'Negócio',
              slug: staffSession.business_slug || ''
            };
          }
        } else if (session) {
          const { data, error } = await supabase.from('businesses').select('*').eq('user_id', session.user.id).single();
          if (!error && data) bData = data;
        }

        if (bData) {
          setBusiness(bData);
          await loadAppointments(bData.id);

          channel = supabase
            .channel('appointments_changes')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'appointments',
                filter: `business_id=eq.${bData.id}`
              },
              () => loadAppointments(bData.id)
            )
            .subscribe();
        }
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [session, staffSession, loadAppointments]);

  const isEmployee = staffSession && staffSession.role !== 'owner';

  const filteredAppointments = appointments.filter(app => {
    return isSameDay(parseISO(app.start_time), selectedDate) && app.status !== 'cancelled';
  });

  const notifications = [...appointments]
    .sort((a, b) => {
      const dateA = a.updated_at || a.created_at;
      const dateB = b.updated_at || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .slice(0, 10);

  const latestNotification = notifications[0];
  const hasNewNotifications = latestNotification && latestNotification.id !== lastNotificationId;

  // Próximo agendamento — corrigido: compara com agora menos 5 minutos de margem
  const now = new Date();
  now.setMinutes(now.getMinutes() - 5);
  const nextAppointment = appointments
    .filter(app => app.status !== 'cancelled' && parseISO(app.start_time) >= now)
    .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())[0];

  const handleCopyLink = () => {
    if (!business) return;
    navigator.clipboard.writeText(`${window.location.origin}/b/${business.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyStaffLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/staff/login`);
    setCopiedStaff(true);
    setTimeout(() => setCopiedStaff(false), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleMarkAttendance = async (appointmentId: string, attended: boolean) => {
    try {
      setUpdatingAttendance(true);
      const updates: any = { attended };

      if (attended) {
        if (!attendanceFinalPrice) {
          alert('Por favor, informe o valor final cobrado pelo serviço.');
          setUpdatingAttendance(false);
          return;
        }
        // Normalize price
        const priceNum = parseFloat(attendanceFinalPrice.replace(',', '.'));
        if (isNaN(priceNum)) {
          alert('Valor inválido.');
          setUpdatingAttendance(false);
          return;
        }
        updates.final_price = priceNum;
      } else {
        updates.final_price = null;
      }

      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId);

      if (error) throw error;

      // Update local state and close/update modal
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, ...updates } : a));
      if (selectedAppointment && selectedAppointment.id === appointmentId) {
        setSelectedAppointment({ ...selectedAppointment, ...updates });
      }
      setAttendanceFinalPrice('');
      alert(attended ? 'Presença confirmada com sucesso!' : 'Falta registrada.');

    } catch (error: any) {
      alert('Erro ao atualizar presença: ' + error.message);
    } finally {
      setUpdatingAttendance(false);
    }
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
    if (staffSession) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 text-center">
          <p className="text-zinc-500">Localizando informações da agenda...</p>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-lg shadow-md max-w-md text-center border border-zinc-200"
        >
          <div className="w-16 h-16 bg-primary/5 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Plus className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-sans font-semibold mb-4 text-zinc-900">Configure seu negócio</h2>
          <p className="text-zinc-500 mb-8 font-sans">Para começar a receber agendamentos, precisamos de algumas informações básicas sobre sua empresa.</p>
          <Link
            to="/dashboard/settings"
            className="block w-full bg-primary text-white py-4 rounded-lg font-sans font-semibold hover:bg-zinc-800 transition-all shadow-lg text-center"
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
        headers: { 'Content-Type': 'application/json', 'token': currentSession.access_token },
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      alert('Erro ao iniciar checkout: ' + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Calendário inline (shared between normal and fullscreen mode)
  const CalendarView = () => (
    <div className="bg-white p-5 md:p-6 rounded-lg border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-sans font-semibold capitalize text-zinc-900">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180 text-zinc-400" />
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
          <button
            onClick={() => setCalendarFullscreen(f => !f)}
            className="p-2 hover:bg-zinc-50 rounded-full transition-colors ml-1"
            title={calendarFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {calendarFullscreen
              ? <Minimize2 className="w-4 h-4 text-zinc-400" />
              : <Maximize2 className="w-4 h-4 text-zinc-400" />
            }
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-sans font-medium text-zinc-300 mb-3">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        {eachDayOfInterval({
          start: startOfMonth(currentMonth),
          end: endOfMonth(currentMonth)
        }).map((day, i) => {
          const hasApp = appointments.some(app => isSameDay(parseISO(app.start_time), day) && app.status !== 'cancelled');
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
                  "absolute bottom-1 w-1.5 h-1.5 rounded-full",
                  isToday ? "bg-white ring-1 ring-primary" : "bg-primary"
                )}></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-all duration-300">
      <Sidebar />

      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-24 md:pb-10 bg-zinc-50/50">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold capitalize text-zinc-900">
              Olá, {isEmployee ? staffSession?.name?.split(' ')[0] : business.name}
            </h1>
            <p className="text-zinc-500 mt-1 text-sm capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Link da Agenda - copia o link público */}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-zinc-200 font-sans font-semibold text-zinc-900 hover:bg-zinc-50 transition-all shadow-sm text-sm flex-1 sm:flex-none"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Link da Agenda'}
            </button>
            {/* Link do Colaborador - copia o link de login */}
            <button
              onClick={handleCopyStaffLink}
              className="flex items-center justify-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-lg font-sans font-semibold hover:bg-black transition-all shadow-sm text-sm flex-1 sm:flex-none"
            >
              {copiedStaff ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {copiedStaff ? 'Copiado!' : 'Link do Colaborador'}
            </button>
          </div>
        </header>

        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-center gap-4 shadow-sm"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-emerald-900 font-sans font-semibold">Pagamento processado!</h3>
              <p className="text-emerald-700 text-sm">Sua assinatura está sendo ativada. Pode levar alguns segundos para atualizar.</p>
            </div>
          </motion.div>
        )}

        {isSubscriptionProblematic && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-sans font-semibold text-amber-900">Assinatura Expirada ou Inativa</h3>
                <p className="text-amber-700 text-sm">Regularize sua assinatura para continuar.</p>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="whitespace-nowrap bg-amber-600 text-white px-8 py-3 rounded-lg font-sans font-semibold hover:bg-amber-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-70"
            >
              {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assinar Plano Pro'}
            </button>
          </div>
        )}

        <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", isSubscriptionProblematic && "opacity-50 pointer-events-none")}>
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card: Próximo Agendamento */}
              <div className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Próximo Agendamento</p>
                {nextAppointment ? (
                  <>
                    <h3 className="text-base font-display font-bold text-zinc-900 mt-1 truncate">{nextAppointment.client_name}</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {format(parseISO(nextAppointment.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </>
                ) : (
                  <h3 className="text-base font-display font-bold text-zinc-400 mt-1">Nenhum agendado</h3>
                )}
              </div>

              {/* Card: Notificações (clicável, substitui Atividade Recente) */}
              <button
                onClick={() => {
                  setShowNotifications(true);
                  if (latestNotification) {
                    setLastNotificationId(latestNotification.id);
                    localStorage.setItem('lastNotificationId_agendai', latestNotification.id);
                  }
                }}
                className="bg-white p-5 rounded-lg border border-zinc-200 shadow-sm text-left hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Bell className="w-5 h-5 text-amber-600" />
                  </div>
                  {notifications.length > 0 && (
                    <span className={cn(
                      "w-6 h-6 bg-amber-500 text-white rounded-full text-xs font-bold flex items-center justify-center",
                      hasNewNotifications && "animate-pulse"
                    )}>
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </div>
                <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest">Notificações</p>
                <h3 className="text-base font-display font-bold text-zinc-900 mt-1">
                  {notifications.length > 0
                    ? `${notifications.length} atividade${notifications.length > 1 ? 's' : ''}`
                    : 'Tudo em dia'
                  }
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Clique para ver detalhes</p>
              </button>
            </div>

            {/* Appointment List */}
            <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-5 md:p-6 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-sans font-semibold text-zinc-900">Compromissos</h3>
                  <p className="text-xs text-zinc-400 mt-0.5 capitalize">
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
                  <div className="p-10 text-center text-zinc-400 italic font-medium">
                    Nenhum agendamento para este dia.
                  </div>
                ) : (
                  filteredAppointments.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => setSelectedAppointment(app)}
                      className="w-full p-5 flex items-center justify-between hover:bg-zinc-50 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-zinc-50 rounded-lg flex flex-col items-center justify-center text-zinc-400 flex-shrink-0 border border-zinc-100 group-hover:border-primary/20 transition-colors">
                          <span className="text-[9px] font-sans font-semibold uppercase">{format(parseISO(app.start_time), 'MMM', { locale: ptBR })}</span>
                          <span className="text-base font-sans font-bold leading-none text-zinc-900">{format(parseISO(app.start_time), 'dd')}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-sans font-semibold text-zinc-900 truncate">{app.client_name}</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-zinc-500">{format(parseISO(app.start_time), 'HH:mm')} - {format(parseISO(app.end_time), 'HH:mm')}</p>
                            {app.service && (
                              <>
                                <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                                <span className="text-xs font-sans font-semibold text-primary uppercase tracking-wider">
                                  {app.service?.name || 'Serviço Padrão'}
                                </span>
                              </>
                            )}
                            {app.professional && (
                              <>
                                <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                                <span className="text-xs font-sans font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                                  <Users className="w-3 h-3" /> {app.professional.name.split(' ')[0]}
                                </span>
                              </>
                            )}
                            {app.attended === true && (
                              <span className="ml-2 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                <CheckCircle2 className="w-3 h-3" /> Concluído
                              </span>
                            )}
                            {app.attended === false && (
                              <span className="ml-2 flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                <XCircle className="w-3 h-3" /> Faltou
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <CalendarView />
          </div>
        </div>
      </main >

      {/* Fullscreen Calendar Overlay */}
      <AnimatePresence>
        {
          calendarFullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-white overflow-y-auto p-4 md:p-10"
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-zinc-900">Agenda</h2>
                    <p className="text-zinc-500 text-sm capitalize">
                      {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <button
                    onClick={() => setCalendarFullscreen(false)}
                    className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-zinc-400" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <CalendarView />
                  <div className="bg-white rounded-lg border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-zinc-100 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-sans font-semibold text-zinc-900">Compromissos</h3>
                        <p className="text-xs text-zinc-400 mt-0.5 capitalize">
                          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </p>
                      </div>
                      <button onClick={() => setSelectedDate(new Date())} className="text-sm text-primary font-sans font-semibold hover:underline">
                        Hoje
                      </button>
                    </div>
                    <div className="divide-y divide-zinc-100 max-h-[60vh] overflow-y-auto">
                      {filteredAppointments.length === 0 ? (
                        <div className="p-10 text-center text-zinc-400 italic">Nenhum agendamento.</div>
                      ) : (
                        filteredAppointments.map((app) => (
                          <button
                            key={app.id}
                            onClick={() => { setSelectedAppointment(app); }}
                            className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors text-left"
                          >
                            <div>
                              <h4 className="font-sans font-semibold text-zinc-900">{app.client_name}</h4>
                              <p className="text-sm text-zinc-500">{format(parseISO(app.start_time), 'HH:mm')} – {format(parseISO(app.end_time), 'HH:mm')}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-300" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* Notifications Panel */}
      <AnimatePresence>
        {
          showNotifications && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowNotifications(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white w-full max-w-md rounded-xl shadow-2xl relative z-10 overflow-hidden max-h-[80vh] flex flex-col"
              >
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                      <Bell className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-sans font-semibold text-zinc-900">Notificações</h3>
                  </div>
                  <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {notifications.length > 0 ? (
                    notifications.map((activity) => (
                      <button
                        key={activity.id}
                        onClick={() => { setSelectedAppointment(activity); setShowNotifications(false); }}
                        className="w-full flex gap-3 items-start text-left hover:bg-zinc-50 p-3 rounded-xl transition-colors group"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                          activity.status === 'cancelled' ? "bg-red-50" : (activity.updated_at ? "bg-blue-50" : "bg-emerald-50")
                        )}>
                          {activity.status === 'cancelled'
                            ? <CalendarX className="w-4 h-4 text-red-500" />
                            : activity.updated_at
                              ? <RefreshCw className="w-4 h-4 text-blue-500" />
                              : <Plus className="w-4 h-4 text-emerald-500" />
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight text-zinc-900">
                            {activity.status === 'cancelled'
                              ? <><span className="text-red-500">Cancelado</span> por <span className="font-semibold">{activity.client_name}</span></>
                              : activity.updated_at
                                ? <>Remarcado por <span className="font-semibold">{activity.client_name}</span></>
                                : <>Novo agendamento de <span className="font-semibold">{activity.client_name}</span></>
                            }
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {format(parseISO(activity.updated_at || activity.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                      </button>
                    ))
                  ) : (
                    <p className="text-center text-zinc-400 italic py-10">Nenhuma atividade recente.</p>
                  )}
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >

      {/* Appointment Details Modal */}
      <AnimatePresence>
        {
          selectedAppointment && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { setSelectedAppointment(null); setAttendanceFinalPrice(''); }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-lg rounded-xl shadow-2xl relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 md:p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-sans font-semibold text-zinc-900">{selectedAppointment.client_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-zinc-500 text-sm">Detalhes do Agendamento</p>
                          {selectedAppointment.status === 'cancelled' && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-sans font-bold uppercase tracking-widest rounded-md flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Cancelado
                            </span>
                          )}
                          {selectedAppointment.attended === true && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-sans font-bold uppercase tracking-widest rounded-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Concluído
                            </span>
                          )}
                          {selectedAppointment.attended === false && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-sans font-bold uppercase tracking-widest rounded-md flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Faltou
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedAppointment(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                      <X className="w-5 h-5 text-zinc-400" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg">
                      <Clock className="w-5 h-5 text-zinc-400" />
                      <div>
                        <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Data e Horário</p>
                        <p className="font-medium text-zinc-900">
                          {format(parseISO(selectedAppointment.start_time), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-lg">
                        <Phone className="w-5 h-5 text-zinc-400" />
                        <div>
                          <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Telefone</p>
                          <p className="font-medium text-zinc-900">{selectedAppointment.client_phone}</p>
                        </div>
                      </div>
                      {/* Retrying email, sometimes clients don't provide phone in some old flows */}
                      <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-lg">
                        <Mail className="w-5 h-5 text-zinc-400" />
                        <div>
                          <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">E-mail</p>
                          <p className="font-medium text-zinc-900 truncate">{selectedAppointment.client_email}</p>
                        </div>
                      </div>

                      {/* Serviço do Fluxo Novo */}
                      {selectedAppointment.service && (
                        <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-lg sm:col-span-2">
                          <Scissors className="w-5 h-5 text-zinc-400" />
                          <div className="flex-1">
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Serviço Agendado</p>
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-zinc-900">{selectedAppointment.service?.name}</p>
                              {selectedAppointment.service?.price !== null && (
                                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  Base: R$ {Number(selectedAppointment.service.price).toFixed(2).replace('.', ',')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Colaborador do Fluxo Novo */}
                      {selectedAppointment.professional && (
                        <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-lg sm:col-span-2">
                          <Users className="w-5 h-5 text-zinc-400" />
                          <div>
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Profissional Responsável</p>
                            <p className="font-medium text-zinc-900">{selectedAppointment.professional?.name}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 border border-zinc-100 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <FileText className="w-4 h-4" />
                        <span className="text-[10px] font-sans font-medium uppercase tracking-widest">Observações</span>
                      </div>
                      <p className="text-zinc-600 leading-relaxed italic text-sm">
                        {selectedAppointment.notes || "Nenhuma observação enviada pelo cliente."}
                      </p>
                    </div>

                    {/* Fluxo de Confirmação de Presença e Valor Final */}
                    {parseISO(selectedAppointment.start_time) < new Date() && selectedAppointment.status !== 'cancelled' && (
                      <div className="mt-8 p-5 bg-zinc-50 border border-zinc-200 rounded-xl">
                        <h4 className="font-sans font-bold text-zinc-900 mb-2">Finalização do Atendimento</h4>
                        <p className="text-sm text-zinc-500 mb-4">O horário deste agendamento já passou. Confirme se o cliente compareceu para alimentar os relatórios.</p>

                        {selectedAppointment.attended === null || selectedAppointment.attended === undefined ? (
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-semibold text-zinc-700 mb-1 block">Valor final cobrado (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder={selectedAppointment.service?.price ? String(selectedAppointment.service.price) : "0.00"}
                                value={attendanceFinalPrice}
                                onChange={(e) => setAttendanceFinalPrice(e.target.value)}
                                className="w-full sm:w-1/2 bg-white border border-zinc-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                              />
                              <p className="text-xs text-zinc-400 mt-1">Prencha este valor para confirmarmos a presença financeira.</p>
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={() => handleMarkAttendance(selectedAppointment.id, true)}
                                disabled={updatingAttendance}
                                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-sans font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 text-sm flex justify-center items-center gap-2"
                              >
                                {updatingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Cliente Compareceu
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(selectedAppointment.id, false)}
                                disabled={updatingAttendance}
                                className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg font-sans font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 text-sm flex justify-center items-center gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                Faltou
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            {selectedAppointment.attended ? (
                              <div className="flex-1 bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex justify-between items-center">
                                <span className="text-emerald-700 font-semibold text-sm flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4" /> Compareceu
                                </span>
                                <span className="text-emerald-700 font-bold bg-white px-2 py-1 rounded-md shadow-sm border border-emerald-100">
                                  R$ {Number(selectedAppointment.final_price).toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex-1 bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2 text-red-700 font-semibold text-sm">
                                <XCircle className="w-4 h-4" /> Falta Registrada
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => { setSelectedAppointment(null); setAttendanceFinalPrice(''); }}
                      className="w-full bg-primary text-white py-3 rounded-lg font-sans font-semibold hover:bg-zinc-800 transition-all shadow-lg"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
      </AnimatePresence>
    </div>
  );
}

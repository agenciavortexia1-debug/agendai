import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Business, Appointment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
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
  MapPin,
  Info,
  Lock,
  Image as ImageIcon,
  ExternalLink
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
                schema: 'Agenda2',
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
    const appDateStr = app.start_time.split('T')[0];
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    return appDateStr === selectedDateStr && app.status !== 'cancelled';
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
          const dayStr = format(day, 'yyyy-MM-dd');
          const hasApp = appointments.some(app => app.start_time.split('T')[0] === dayStr && app.status !== 'cancelled');
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
    <div className="h-screen flex flex-col md:flex-row overflow-hidden transition-all duration-300 bg-zinc-50">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {/* Compact Top Bar */}
        <header className="flex-shrink-0 bg-white border-b border-zinc-100 px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h1 className="text-sm font-sans font-bold text-zinc-900 truncate leading-tight">
                {isEmployee ? staffSession?.name?.split(' ')[0] : business.name}
              </h1>
              <p className="text-[10px] text-zinc-400 capitalize leading-tight hidden sm:block">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Próximo agendamento inline */}
            {nextAppointment && (
              <div className="hidden lg:flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 text-xs text-emerald-700 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Próximo: <strong>{nextAppointment.client_name.split(' ')[0]}</strong> às {format(parseISO(nextAppointment.start_time), 'HH:mm')}</span>
              </div>
            )}
            {/* Notificações */}
            <button
              onClick={() => {
                setShowNotifications(true);
                if (latestNotification) {
                  setLastNotificationId(latestNotification.id);
                  localStorage.setItem('lastNotificationId_agendai', latestNotification.id);
                }
              }}
              className="relative p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg transition-all"
              title="Notificações"
            >
              <Bell className="w-5 h-5" />
              {hasNewNotifications && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </button>
            {/* Link Agenda */}
            <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
              <button
                onClick={handleCopyLink}
                disabled={!business?.slug}
                className="flex items-center gap-1.5 bg-white px-3 py-2 font-medium text-zinc-700 hover:bg-zinc-50 transition-all text-xs disabled:opacity-40"
                title="Copiar link da agenda"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Link'}</span>
              </button>
              {business?.slug && (
                <a
                  href={`/b/${business.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-2 bg-zinc-50 border-l border-zinc-200 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
                  title="Abrir agenda"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            {/* Link Colaborador */}
            <button
              onClick={handleCopyStaffLink}
              className="flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-2 rounded-lg font-medium hover:bg-black transition-all text-xs"
              title="Copiar link do colaborador"
            >
              {copiedStaff ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedStaff ? 'Copiado!' : 'Colaborador'}</span>
            </button>
          </div>
        </header>

        {isSuccess && (
          <div className="flex-shrink-0 mx-4 mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <p className="text-emerald-800 text-sm font-medium">Pagamento processado! Assinatura sendo ativada.</p>
          </div>
        )}

        {isSubscriptionProblematic && (
          <div className="flex-shrink-0 mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-amber-800 text-sm font-medium truncate">Assinatura expirada ou inativa.</p>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="whitespace-nowrap bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-700 transition-all flex-shrink-0"
            >
              {checkoutLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Renovar'}
            </button>
          </div>
        )}

        {/* Content Area: left panel (list) + right panel (calendar) */}
        <div className={cn(
          "flex-1 flex flex-col md:flex-row overflow-hidden gap-0 min-h-0",
          isSubscriptionProblematic && "opacity-50 pointer-events-none"
        )}>
          {/* Left: Appointment List */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Date selector bar */}
            <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-zinc-100 bg-white flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 capitalize">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h2>
                <p className="text-[11px] text-zinc-400">{filteredAppointments.length} agendamento{filteredAppointments.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setSelectedDate(new Date())} className="text-xs text-primary font-semibold hover:underline">
                Hoje
              </button>
            </div>
            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
              {filteredAppointments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-300 p-8 gap-2">
                  <CalendarIcon className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">Nenhum agendamento para este dia</p>
                </div>
              ) : (
                filteredAppointments.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedAppointment(app)}
                    className="w-full px-4 md:px-6 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Time block */}
                      <div className="text-center flex-shrink-0 w-10">
                        <span className="text-xs font-bold text-zinc-900 block">{format(parseISO(app.start_time), 'HH:mm')}</span>
                        <span className="text-[10px] text-zinc-400">{format(parseISO(app.end_time), 'HH:mm')}</span>
                      </div>
                      {/* Divider */}
                      <div className="w-px h-8 bg-zinc-100 flex-shrink-0" />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-800 truncate">{app.client_name}</h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {app.service && (
                            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                              {app.service?.name || 'Serviço'}
                            </span>
                          )}
                          {app.professional && (
                            <>
                              {app.service && <span className="w-0.5 h-0.5 bg-zinc-300 rounded-full" />}
                              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <Users className="w-2.5 h-2.5" /> {app.professional.name.split(' ')[0]}
                              </span>
                            </>
                          )}
                          {app.attended === true && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                              <CheckCircle2 className="w-2.5 h-2.5" /> OK
                            </span>
                          )}
                          {app.attended === false && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                              <XCircle className="w-2.5 h-2.5" /> Faltou
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-200 group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: Calendar */}
          <div className="hidden md:flex flex-col w-64 xl:w-72 border-l border-zinc-100 flex-shrink-0 bg-white overflow-hidden">
            <CalendarView />
          </div>
        </div>
      </main>

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
                      <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-lg sm:col-span-2">
                        <Phone className="w-5 h-5 text-zinc-400" />
                        <div>
                          <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Telefone</p>
                          <p className="font-medium text-zinc-900">{selectedAppointment.client_phone}</p>
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

                      {/* Endereço informado no agendamento */}
                      {selectedAppointment.address && (
                        <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-lg sm:col-span-2">
                          <MapPin className="w-5 h-5 text-zinc-400" />
                          <div>
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Endereço de Atendimento</p>
                            <p className="font-medium text-zinc-900">{selectedAppointment.address}</p>
                          </div>
                        </div>
                      )}

                      {/* Referência informada no agendamento */}
                      {selectedAppointment.reference && (
                        <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-lg sm:col-span-2">
                          <Info className="w-5 h-5 text-zinc-400" />
                          <div>
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Ponto de Referência</p>
                            <p className="font-medium text-zinc-900">{selectedAppointment.reference}</p>
                          </div>
                        </div>
                      )}

                      {/* Foto de Referência */}
                      {selectedAppointment.reference_image_url && (
                        <div className="flex flex-col gap-2 p-4 border border-zinc-100 rounded-lg sm:col-span-2">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-zinc-400" />
                            <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">Foto de Referência</p>
                          </div>
                          <a
                            href={selectedAppointment.reference_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 group hover:opacity-90 transition-all flex items-center justify-center bg-zinc-50 shadow-inner"
                          >
                            <img
                              src={selectedAppointment.reference_image_url}
                              alt="Referência"
                              className="max-h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                              <div className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                                <ExternalLink className="w-4 h-4 text-zinc-900" />
                              </div>
                            </div>
                          </a>
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

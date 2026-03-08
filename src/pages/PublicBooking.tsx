import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Business, Appointment, AvailableSlot, Service, Professional } from '../types';
import { generateAvailableSlots } from '../lib/scheduling';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Scissors,
  MapPin,
  Info
} from 'lucide-react';
import {
  format,
  addDays,
  startOfToday,
  isSameDay,
  startOfDay,
  parseISO,
  isBefore,
  endOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import ClientBookingAuth from '../components/ClientBookingAuth';

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [profServicesData, setProfServicesData] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Mudei os passos para suportar o novo fluxo
  type Step = 'auth' | 'service' | 'professional' | 'date' | 'form' | 'success';
  const [step, setStep] = useState<Step>('auth');

  const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);
  const [loadingUserAppointments, setLoadingUserAppointments] = useState(false);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [hasConfirmedAuth, setHasConfirmedAuth] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    address: '',
    reference: ''
  });
  const [booking, setBooking] = useState(false);

  // Load session
  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      const session = res.data?.session;
      setSession(session || null);
      if (session?.user) {
        setFormData(prev => ({
          ...prev,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || prev.name,
          phone: session.user.user_metadata?.phone || prev.phone
        }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setFormData(prev => ({
          ...prev,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || prev.name,
          phone: session.user.user_metadata?.phone || prev.phone
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user appointments
  useEffect(() => {
    async function loadUserAppointments() {
      if (!business || !session?.user) return;
      setLoadingUserAppointments(true);

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('business_id', business.id)
        .eq('client_id', session.user.id)
        .neq('status', 'cancelled')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (!error && data) {
        setUserAppointments(data);
      }
      setLoadingUserAppointments(false);
    }

    if (business && session) {
      loadUserAppointments();
    }
  }, [business, session]);

  // Load business data, services and professionals
  useEffect(() => {
    async function loadBusinessData() {
      if (!slug) return;

      const { data: bData, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !bData) {
        setError(error?.message === 'Failed to fetch' ? 'Erro de conexão.' : 'Negócio não encontrado');
        setLoading(false);
        return;
      }

      setBusiness(bData);
      if (bData.primary_color) {
        document.documentElement.style.setProperty('--primary-color', bData.primary_color);
      }

      // Load Services
      const { data: sData } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', bData.id)
        .order('name');
      if (sData) setServices(sData);

      // Load Professionals
      const { data: pData } = await supabase
        .from('professionals')
        .select('*')
        .eq('business_id', bData.id);
      if (pData) setProfessionals(pData);

      // Load relations (Which professional does what service)
      const { data: psData } = await supabase
        .from('professional_services')
        .select('*');
      if (psData) setProfServicesData(psData);

      setLoading(false);
    }
    loadBusinessData();
  }, [slug]);

  // Load slots when date or professional changes
  useEffect(() => {
    async function loadSlots() {
      if (!business || !selectedDate || !selectedService || !selectedProfessional) return;
      setLoadingSlots(true);

      try {
        const weekday = selectedDate.getDay();

        // 1. Get business hours
        const { data: hours } = await supabase
          .from('business_hours')
          .select('*')
          .eq('business_id', business.id)
          .eq('weekday', weekday)
          .single();

        if (!hours || hours.is_closed) {
          setAvailableSlots([]);
          return;
        }

        // 2. Get appointments specifically for the selected professional on this day
        const dayStart = startOfDay(selectedDate).toISOString();
        const dayEnd = endOfDay(selectedDate).toISOString();

        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('*')
          .eq('business_id', business.id)
          .eq('professional_id', selectedProfessional.id)
          .gte('start_time', dayStart)
          .lte('start_time', dayEnd)
          .neq('status', 'cancelled');

        // 3. Get generic blocked times of the business
        const { data: blocked } = await supabase
          .from('blocked_times')
          .select('*')
          .eq('business_id', business.id)
          .gte('start_time', dayStart)
          .lte('start_time', dayEnd);

        // 4. Generate slots using service duration
        const duration = selectedService.duration_minutes || 30;

        const slots = generateAvailableSlots(
          hours.open_time,
          hours.close_time,
          duration,
          appointmentsData || [],
          blocked || [],
          selectedDate
        );

        setAvailableSlots(slots);
      } catch (err) {
        console.error('Error loading slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    }

    if (step === 'date') {
      loadSlots();
    }
  }, [business, selectedDate, selectedProfessional, selectedService, step]);

  const handleAuthSuccess = (userId: string, name: string, email: string) => {
    setFormData(prev => ({ ...prev, name, email }));
    setHasConfirmedAuth(true);
    setStep('service');
  };

  const handleSignOut = () => {
    setHasConfirmedAuth(false);
    setStep('auth');
    setSession(null);
    setUserAppointments([]);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedProfessional(null); // reset prof if changing service
    setStep('professional');
  };

  const handleProfessionalSelect = (prof: Professional) => {
    setSelectedProfessional(prof);
    setStep('date');
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      alert('Erro ao cancelar: ' + error.message);
    } else {
      alert('Cancelado com sucesso!');
      setUserAppointments(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleRescheduleClick = (appointment: Appointment) => {
    setReschedulingAppointment(appointment);
    // Para simplificar, na remarcação nós resetamos a seleção de serviço e profissional
    setStep('service');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !business) return;

    // Get fresh session to ensure we have the user ID
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user) {
      alert('Sessão expirada. Por favor, faça login novamente.');
      setStep('auth');
      return;
    }

    setBooking(true);
    try {
      // Update user metadata with phone
      await supabase.auth.updateUser({
        data: { phone: formData.phone }
      });

      let appointmentId = '';

      if (reschedulingAppointment) {
        const { error } = await supabase
          .from('appointments')
          .update({
            start_time: selectedSlot.start.toISOString(),
            end_time: selectedSlot.end.toISOString(),
            client_phone: formData.phone,
            service_id: selectedService?.id || null, // Atualizado
            professional_id: selectedProfessional?.id || null, // Atualizado
            notes: formData.notes,
            address: formData.address || null,
            reference: formData.reference || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', reschedulingAppointment.id);

        if (error) throw error;
        appointmentId = reschedulingAppointment.id;
      } else {
        const { data, error } = await supabase
          .from('appointments')
          .insert({
            business_id: business.id,
            client_id: currentSession.user.id,
            client_name: formData.name,
            client_email: formData.email,
            client_phone: formData.phone,
            service_id: selectedService?.id || null, // Atualizado
            professional_id: selectedProfessional?.id || null, // Atualizado
            notes: formData.notes,
            address: formData.address || null,
            reference: formData.reference || null,
            start_time: selectedSlot.start.toISOString(),
            end_time: selectedSlot.end.toISOString(),
            status: 'confirmed'
          })
          .select()
          .single();

        if (error) throw error;
        appointmentId = data.id;
      }

      // Refresh user appointments list immediately
      const { data: updatedApps } = await supabase
        .from('appointments')
        .select('*')
        .eq('business_id', business.id)
        .eq('client_id', currentSession.user.id)
        .neq('status', 'cancelled')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (updatedApps) setUserAppointments(updatedApps);

      setStep('date');
      setReschedulingAppointment(null);
      setSelectedSlot(null);

      // Scroll to my appointments section
      setTimeout(() => {
        const el = document.getElementById('my-appointments');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      alert('Erro ao realizar agendamento: ' + err.message);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="bg-white p-10 rounded-xl shadow-xl max-w-md text-center border border-zinc-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-sans font-semibold mb-2 text-zinc-900">{error || 'Algo deu errado'}</h2>
          <p className="text-zinc-500">O link que você acessou pode estar incorreto ou o negócio não existe mais.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 md:py-12 px-4 md:px-6 bg-zinc-50"
    >
      <div className="max-w-4xl mx-auto">
        {/* Business Header */}
        <header className="text-center mb-10 md:mb-16 relative">
          {session && (
            <div className="absolute -top-4 right-0 flex items-center gap-2 text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400">
              <span className="text-zinc-900">{formData.name || session.user.email}</span>
              <button
                onClick={handleSignOut}
                className="underline hover:text-zinc-900 transition-colors"
              >
                Sair
              </button>
            </div>
          )}
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} className="w-20 h-20 md:w-24 md:h-24 rounded-xl mx-auto mb-4 md:mb-6 shadow-md object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl shadow-primary/10">
              <CalendarIcon className="text-white w-8 h-8 md:w-10 md:h-10" />
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-display font-bold text-zinc-900 mb-4 capitalize tracking-tight">{business.name}</h1>
          <p className="text-zinc-500 max-w-lg mx-auto leading-relaxed">
            {business.description || "Agende seu horário de forma simples e rápida."}
          </p>
        </header>

        <AnimatePresence mode="wait">
          {(step === 'auth' || !hasConfirmedAuth) && (
            <ClientBookingAuth
              onSuccess={handleAuthSuccess}
              onBack={() => window.history.back()}
              initialEmail={formData.email}
              initialName={formData.name}
              session={session}
            />
          )}

          {step === 'date' && hasConfirmedAuth && (
            <div className="space-y-12">
              {/* User Appointments Section */}
              <motion.div
                id="my-appointments"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 md:p-8 rounded-xl shadow-xl border border-zinc-100"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-sans font-semibold text-zinc-900">Seus Agendamentos</h2>
                  <div className="px-3 py-1 bg-zinc-50 rounded-lg text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400 border border-zinc-100">
                    {userAppointments.length} {userAppointments.length === 1 ? 'Agendamento' : 'Agendamentos'}
                  </div>
                </div>

                {loadingUserAppointments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-200" />
                  </div>
                ) : userAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {userAppointments.map((app) => (
                      <div key={app.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-zinc-50 rounded-lg gap-4 border border-zinc-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                            <CalendarIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900">{format(parseISO(app.start_time), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
                            <p className="text-sm text-zinc-500">{format(parseISO(app.start_time), "HH:mm")}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRescheduleClick(app)}
                            className="flex-1 md:flex-none px-4 py-2 bg-white text-zinc-600 rounded-lg text-sm font-sans font-semibold hover:text-zinc-900 transition-colors border border-zinc-200 shadow-sm"
                          >
                            Agendar Novamente
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(app.id)}
                            className="flex-1 md:flex-none px-4 py-2 bg-red-50 text-red-500 rounded-lg text-sm font-sans font-semibold hover:bg-red-100 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-zinc-50/50 rounded-lg border border-dashed border-zinc-200">
                    <p className="text-zinc-400 text-sm">Você ainda não possui agendamentos marcados.</p>
                  </div>
                )}
              </motion.div>

              {reschedulingAppointment && (
                <div className="bg-[var(--primary-color)] text-white p-4 rounded-xl flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Novo agendamento baseado em {format(parseISO(reschedulingAppointment.start_time), "d/MM 'às' HH:mm")}
                  </p>
                  <button
                    onClick={() => setReschedulingAppointment(null)}
                    className="text-xs font-sans font-semibold underline"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <motion.div
                key="date"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
              >
                {/* Calendar Section */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl border border-zinc-100">
                  <div className="flex items-center justify-between mb-6 md:mb-8">
                    <h2 className="text-lg md:text-xl font-sans font-semibold text-zinc-900">Selecione o Dia</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                        className="p-2 hover:bg-zinc-50 rounded-full transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                        className="p-2 hover:bg-zinc-50 rounded-full transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-zinc-400" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-[10px] font-sans font-medium text-zinc-300 mb-4">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
                  </div>

                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {Array.from({ length: 14 }).map((_, i) => {
                      const date = addDays(startOfToday(), i);
                      const isSelected = isSameDay(date, selectedDate);
                      const isPast = isBefore(date, startOfToday());

                      return (
                        <button
                          key={i}
                          disabled={isPast}
                          onClick={() => setSelectedDate(date)}
                          className={cn(
                            "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center transition-all",
                            isSelected ? "bg-[var(--primary-color)] text-white shadow-lg scale-105" : "hover:bg-black/5",
                            isPast && "opacity-20 cursor-not-allowed"
                          )}
                        >
                          <span className="text-[8px] md:text-[10px] font-sans font-medium uppercase opacity-60 mb-0.5 md:mb-1">
                            {format(date, 'EEE', { locale: ptBR })}
                          </span>
                          <span className="text-sm md:text-lg font-sans font-semibold">{format(date, 'd')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slots Section */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl border border-zinc-100">
                  <h2 className="text-lg md:text-xl font-sans font-semibold mb-6 md:mb-8 text-zinc-900">Horários Disponíveis</h2>

                  {loadingSlots ? (
                    <div className="flex flex-col items-center justify-center h-48 md:h-64 text-zinc-200">
                      <Loader2 className="w-8 h-8 animate-spin mb-4" />
                      <p className="text-sm font-medium text-zinc-400">Buscando horários...</p>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {availableSlots.map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => handleSlotSelect(slot)}
                          className="p-3 md:p-4 bg-zinc-50 rounded-lg text-center font-sans font-semibold hover:bg-primary hover:text-white transition-all group border border-zinc-100 shadow-sm hover:shadow-lg hover:shadow-primary/20"
                        >
                          <Clock className="w-4 h-4 mx-auto mb-1 md:mb-2 opacity-20 group-hover:opacity-100 transition-opacity" />
                          <span className="text-sm md:text-base">{format(slot.start, 'HH:mm')}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 md:h-64 text-center">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 border border-zinc-100">
                        <Clock className="w-6 h-6 md:w-8 md:h-8 text-zinc-200" />
                      </div>
                      <p className="text-zinc-400 text-sm md:text-base font-medium">Nenhum horário disponível para este dia.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* NOVO: Passo de Serviço */}
          {step === 'service' && hasConfirmedAuth && (
            <motion.div
              key="service-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-white rounded-xl p-6 md:p-8 shadow-xl border border-zinc-100">
                <h2 className="text-xl md:text-2xl font-display font-semibold text-zinc-900 mb-2">1. Escolha o serviço</h2>
                <p className="text-zinc-500 mb-6 text-sm">Selecione o que você deseja realizar hoje.</p>

                {services.length === 0 ? (
                  <div className="text-center p-6 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                    <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">Nenhum serviço cadastrado no momento.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map(service => (
                      <button
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:border-[var(--primary-color)] hover:shadow-md transition-all group text-left bg-white"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-zinc-900">{service.name}</h3>
                          <div className="flex gap-3 mt-1">
                            <span className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {service.duration_minutes} min
                            </span>
                            {service.price !== null && (
                              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                R$ {Number(service.price).toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-[var(--primary-color)] transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* NOVO: Passo de Colaborador */}
          {step === 'professional' && hasConfirmedAuth && selectedService && (
            <motion.div
              key="professional-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-white rounded-xl p-6 md:p-8 shadow-xl border border-zinc-100">
                <button
                  onClick={() => setStep('service')}
                  className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-6 text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trocar serviço ({selectedService.name})
                </button>

                <h2 className="text-xl md:text-2xl font-display font-semibold text-zinc-900 mb-2">2. Escolha o profissional</h2>
                <p className="text-zinc-500 mb-6 text-sm">Quem você deseja que realize o atendimento?</p>

                <div className="space-y-3">
                  {/* O "Qualquer profissional" pega o primeiro, ou podemos criar lógic a complexa, mas vamos obrigar escolha neste momento */}
                  {professionals
                    .filter(prof => profServicesData.some(ps => ps.professional_id === prof.id && ps.service_id === selectedService.id))
                    .length === 0 ? (
                    <div className="text-center p-6 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-sm text-amber-700">Nenhum profissional atende este serviço no momento.</p>
                    </div>
                  ) : (
                    professionals
                      .filter(prof => profServicesData.some(ps => ps.professional_id === prof.id && ps.service_id === selectedService.id))
                      .map(prof => (
                        <button
                          key={prof.id}
                          onClick={() => handleProfessionalSelect(prof)}
                          className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:border-[var(--primary-color)] hover:shadow-md transition-all group text-left bg-white"
                        >
                          <div className="flex items-center gap-4">
                            {prof.avatar_url ? (
                              <img src={prof.avatar_url} alt={prof.name} className="w-12 h-12 rounded-full object-cover bg-zinc-100" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center font-medium text-zinc-500 text-lg">
                                {prof.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-zinc-900">{prof.name}</h3>
                              {prof.bio && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{prof.bio}</p>}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-[var(--primary-color)] transition-colors" />
                        </button>
                      ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'form' && selectedSlot && selectedService && selectedProfessional && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-white rounded-xl p-6 md:p-10 shadow-xl border border-zinc-100">
                <button
                  onClick={() => setStep('date')}
                  className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-6 md:mb-8 text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Alterar data ou horário
                </button>

                <div className="flex border border-zinc-100 rounded-lg overflow-hidden mb-8 shadow-sm">
                  <div className="bg-zinc-50 p-4 border-r border-zinc-100 flex-1 flex flex-col items-center justify-center text-center">
                    <Scissors className="w-5 h-5 text-zinc-400 mb-1" />
                    <p className="font-semibold text-zinc-900 text-sm whitespace-nowrap overflow-hidden text-ellipsis w-[100px]">{selectedService.name}</p>
                  </div>
                  <div className="bg-zinc-50 p-4 border-r border-zinc-100 flex-1 flex flex-col items-center justify-center text-center">
                    <User className="w-5 h-5 text-zinc-400 mb-1" />
                    <p className="font-semibold text-zinc-900 text-sm truncate whitespace-nowrap overflow-hidden text-ellipsis w-[100px]">{selectedProfessional.name.split(' ')[0]}</p>
                  </div>
                  <div className="bg-[var(--primary-color)] text-white p-4 flex-1 flex flex-col items-center justify-center text-center">
                    <Clock className="w-5 h-5 mb-1 opacity-80" />
                    <p className="font-bold text-sm whitespace-nowrap">{format(selectedSlot.start, "dd/MM - HH:mm")}</p>
                  </div>
                </div>

                <form onSubmit={handleBooking} className="space-y-6">

                  <div className="space-y-2">
                    <label className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Seu Nome</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all text-zinc-900"
                        placeholder="Nome completo"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all text-zinc-900"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Observações (opcional)</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-4 px-4 focus:ring-2 focus:ring-primary transition-all min-h-[100px] text-zinc-900"
                      placeholder="Alguma informação adicional?"
                    />
                  </div>

                  {business.show_address && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Endereço de Atendimento</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                        <input
                          type="text"
                          required
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all text-zinc-900"
                          placeholder="Rua, número, bairro..."
                        />
                      </div>
                    </div>
                  )}

                  {business.show_reference && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Ponto de Referência</label>
                      <div className="relative">
                        <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                        <input
                          type="text"
                          value={formData.reference}
                          onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-lg py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all text-zinc-900"
                          placeholder="Próximo a..."
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={booking}
                    className="w-full bg-primary text-white py-5 rounded-lg font-sans font-semibold hover:bg-zinc-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {booking ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      reschedulingAppointment ? 'Confirmar Novo Horário' : 'Confirmar Agendamento'
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="bg-white rounded-xl p-8 md:p-12 shadow-2xl border border-zinc-100">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-6 md:mb-8">
                  <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-emerald-500" />
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-zinc-900 mb-4">
                  {reschedulingAppointment ? 'Horário Alterado!' : 'Tudo pronto!'}
                </h2>
                <p className="text-zinc-500 mb-6 md:mb-8 leading-relaxed text-sm md:text-base">
                  {reschedulingAppointment
                    ? `Seu agendamento em ${business.name} foi alterado com sucesso.`
                    : `Seu agendamento para ${business.name} foi confirmado com sucesso.`
                  }
                </p>
                <div className="bg-zinc-50 p-6 rounded-lg mb-8 text-left border border-zinc-100">
                  <p className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-400 mb-2">Resumo</p>
                  <p className="font-semibold text-sm md:text-base text-zinc-900">
                    {selectedSlot ? format(selectedSlot.start, "EEEE, d 'de' MMMM", { locale: ptBR }) : 'Horário não selecionado'}
                  </p>
                  <p className="text-xl md:text-2xl font-display font-bold text-primary">
                    {selectedSlot ? format(selectedSlot.start, "HH:mm") : '--:--'}
                  </p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-primary font-sans font-semibold hover:underline text-sm md:text-base"
                >
                  Realizar outro agendamento
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

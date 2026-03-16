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
  Info,
  Upload,
  Image as ImageIcon,
  X
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
  const [referenceFile, setReferenceFile] = useState<File | null>(null);

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

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user) {
      alert('Sessão expirada. Por favor, faça login novamente.');
      setStep('auth');
      return;
    }

    setBooking(true);
    try {
      let referenceImageUrl: string | null = null;
      if (referenceFile) {
        const fileExt = referenceFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${business.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('references').upload(filePath, referenceFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('references').getPublicUrl(filePath);
        referenceImageUrl = publicUrl;
      }

      await supabase.auth.updateUser({ data: { phone: formData.phone } });

      if (reschedulingAppointment) {
        const { error } = await supabase.from('appointments').update({
          start_time: selectedSlot.start.toISOString(),
          end_time: selectedSlot.end.toISOString(),
          client_phone: formData.phone,
          service_id: selectedService?.id || null,
          professional_id: selectedProfessional?.id || null,
          notes: formData.notes,
          address: formData.address || null,
          reference: formData.reference || null,
          reference_image_url: referenceImageUrl || reschedulingAppointment.reference_image_url || null,
          updated_at: new Date().toISOString()
        }).eq('id', reschedulingAppointment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('appointments').insert({
          business_id: business.id,
          client_id: currentSession.user.id,
          client_name: formData.name,
          client_email: formData.email,
          client_phone: formData.phone,
          service_id: selectedService?.id || null,
          professional_id: selectedProfessional?.id || null,
          notes: formData.notes,
          address: formData.address || null,
          reference: formData.reference || null,
          reference_image_url: referenceImageUrl,
          start_time: selectedSlot.start.toISOString(),
          end_time: selectedSlot.end.toISOString(),
          status: 'confirmed'
        });
        if (error) throw error;
      }

      // Refresh user appointments
      const { data: updatedApps } = await supabase.from('appointments').select('*')
        .eq('business_id', business.id).eq('client_id', currentSession.user.id)
        .neq('status', 'cancelled').gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });
      if (updatedApps) setUserAppointments(updatedApps);

      setReschedulingAppointment(null);
      setStep('success');
    } catch (err: any) {
      alert('Erro ao realizar agendamento: ' + err.message);
    } finally {
      setBooking(false);
    }
  };

  // Step progress indicator
  const STEPS = [
    { id: 'service', label: 'Serviço' },
    { id: 'professional', label: 'Profissional' },
    { id: 'date', label: 'Data & Horário' },
    { id: 'form', label: 'Seus dados' },
  ];
  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="bg-white p-10 rounded-xl shadow-xl max-w-md text-center border border-zinc-100">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-zinc-900">{error || 'Algo deu errado'}</h2>
          <p className="text-zinc-500 text-sm">O link pode estar incorreto ou o negócio não existe.</p>
        </div>
      </div>
    );
  }

  // Brand color from business
  const brandColor = business.primary_color || '#18181b';

  return (
    <div className="min-h-screen bg-zinc-50" style={{ '--primary': brandColor } as any}>
      {/* Top brand bar */}
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="text-sm font-bold text-zinc-900 capitalize">{business.name}</span>
          </div>
          {session && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="hidden sm:inline font-medium text-zinc-600">{formData.name || session.user.email}</span>
              <button onClick={handleSignOut} className="text-zinc-400 hover:text-zinc-700 transition-colors underline">
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        {!hasConfirmedAuth && (
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 mb-1 capitalize">{business.name}</h1>
            <p className="text-zinc-500 text-sm">{business.description || 'Agende seu horário de forma simples e rápida.'}</p>
          </div>
        )}

        {/* Step progress bar (only after auth) */}
        {hasConfirmedAuth && step !== 'success' && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      i < currentStepIdx ? "bg-emerald-500 text-white" :
                      i === currentStepIdx ? "bg-zinc-900 text-white ring-4 ring-zinc-900/10" :
                      "bg-zinc-100 text-zinc-400"
                    )}>
                      {i < currentStepIdx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold mt-1 text-center hidden sm:block",
                      i === currentStepIdx ? "text-zinc-900" : "text-zinc-400"
                    )}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-1 rounded-full transition-all",
                      i < currentStepIdx ? "bg-emerald-400" : "bg-zinc-100"
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* AUTH */}
          {(step === 'auth' || !hasConfirmedAuth) && (
            <ClientBookingAuth
              onSuccess={handleAuthSuccess}
              onBack={() => window.history.back()}
              initialEmail={formData.email}
              initialName={formData.name}
              session={session}
            />
          )}

          {/* STEP 1: SERVICE */}
          {step === 'service' && hasConfirmedAuth && (
            <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-zinc-900">Escolha o serviço</h2>
                <p className="text-sm text-zinc-500">O que você deseja realizar?</p>
              </div>
              {services.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-zinc-200 p-10 text-center">
                  <AlertCircle className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">Nenhum serviço cadastrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {services.map(service => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service)}
                      className="w-full group flex items-center justify-between p-4 bg-white rounded-xl border border-zinc-200 hover:border-zinc-900 hover:shadow-md transition-all text-left"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-zinc-900">{service.name}</h3>
                          {service.price !== null && Number(service.price) > 0 && (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              R$ {Number(service.price).toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400">
                          <Clock className="w-3 h-3" />
                          <span>{service.duration_minutes} min</span>
                          {service.description && <><span className="mx-1">·</span><span className="truncate max-w-[200px]">{service.description}</span></>}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* My appointments section */}
              {userAppointments.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Seus Agendamentos</h3>
                  <div className="space-y-2">
                    {userAppointments.map(app => (
                      <div key={app.id} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-zinc-900 text-sm capitalize">
                            {format(parseISO(app.start_time), "EEEE, d 'de' MMMM", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-zinc-500">{format(parseISO(app.start_time), 'HH:mm')}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleRescheduleClick(app)}
                            className="text-xs text-zinc-500 hover:text-zinc-900 font-semibold transition-colors"
                          >
                            Reagendar
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(app.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: PROFESSIONAL */}
          {step === 'professional' && hasConfirmedAuth && selectedService && (
            <motion.div key="professional" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setStep('service')} className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-700 text-sm font-medium mb-5 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <div className="mb-5">
                <div className="inline-flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-1.5 mb-3">
                  <Scissors className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs font-semibold text-zinc-700">{selectedService.name}</span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900">Escolha o profissional</h2>
                <p className="text-sm text-zinc-500">Quem realizará seu atendimento?</p>
              </div>

              {(() => {
                const available = professionals.filter(prof =>
                  profServicesData.some(ps => ps.professional_id === prof.id && ps.service_id === selectedService.id)
                );
                if (available.length === 0) return (
                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-6 text-center">
                    <p className="text-sm text-amber-700">Nenhum profissional disponível para este serviço.</p>
                    <button onClick={() => setStep('service')} className="mt-3 text-xs font-semibold text-amber-700 underline">
                      Escolher outro serviço
                    </button>
                  </div>
                );
                return (
                  <div className="space-y-2">
                    {available.map(prof => (
                      <button
                        key={prof.id}
                        onClick={() => handleProfessionalSelect(prof)}
                        className="w-full group flex items-center gap-4 p-4 bg-white rounded-xl border border-zinc-200 hover:border-zinc-900 hover:shadow-md transition-all text-left"
                      >
                        {prof.avatar_url ? (
                          <img src={prof.avatar_url} alt={prof.name} className="w-11 h-11 rounded-full object-cover bg-zinc-100 flex-shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-500 text-base flex-shrink-0">
                            {prof.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-zinc-900">{prof.name}</h3>
                          {prof.bio && <p className="text-xs text-zinc-500 truncate">{prof.bio}</p>}
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* STEP 3: DATE + TIME */}
          {step === 'date' && hasConfirmedAuth && (
            <motion.div key="date" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setStep('professional')} className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-700 text-sm font-medium mb-5 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <div className="mb-5">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {selectedService && (
                    <div className="inline-flex items-center gap-1.5 bg-zinc-100 rounded-lg px-3 py-1.5">
                      <Scissors className="w-3 h-3 text-zinc-500" />
                      <span className="text-xs font-semibold text-zinc-700">{selectedService.name}</span>
                    </div>
                  )}
                  {selectedProfessional && (
                    <div className="inline-flex items-center gap-1.5 bg-zinc-100 rounded-lg px-3 py-1.5">
                      <User className="w-3 h-3 text-zinc-500" />
                      <span className="text-xs font-semibold text-zinc-700">{selectedProfessional.name.split(' ')[0]}</span>
                    </div>
                  )}
                </div>
                <h2 className="text-lg font-bold text-zinc-900">Escolha a data e horário</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date picker */}
                <div className="bg-white rounded-xl border border-zinc-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Data</h3>
                    <div className="flex gap-1">
                      <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-1.5 hover:bg-zinc-50 rounded-lg transition-colors">
                        <ChevronLeft className="w-4 h-4 text-zinc-400" />
                      </button>
                      <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-1.5 hover:bg-zinc-50 rounded-lg transition-colors">
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-zinc-300 mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
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
                            "aspect-square rounded-lg flex flex-col items-center justify-center transition-all",
                            isSelected ? "bg-zinc-900 text-white shadow-md scale-105" : "hover:bg-zinc-50 text-zinc-600",
                            isPast && "opacity-20 cursor-not-allowed"
                          )}
                        >
                          <span className="text-[8px] font-bold uppercase opacity-60">{format(date, 'EEE', { locale: ptBR })}</span>
                          <span className="text-sm font-bold">{format(date, 'd')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                <div className="bg-white rounded-xl border border-zinc-200 p-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
                    Horários — {format(selectedDate, "dd/MM", { locale: ptBR })}
                  </h3>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                      {availableSlots.map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => handleSlotSelect(slot)}
                          className="p-3 bg-zinc-50 rounded-lg text-center font-semibold text-sm hover:bg-zinc-900 hover:text-white transition-all border border-zinc-100 hover:border-zinc-900 hover:shadow-md"
                        >
                          {format(slot.start, 'HH:mm')}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                      <Clock className="w-8 h-8 text-zinc-200 mb-2" />
                      <p className="text-sm text-zinc-400">Nenhum horário disponível</p>
                      <p className="text-xs text-zinc-300">Tente outro dia</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: FORM */}
          {step === 'form' && selectedSlot && selectedService && selectedProfessional && (
            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setStep('date')} className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-700 text-sm font-medium mb-5 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>

              {/* Summary card */}
              <div className="bg-zinc-900 rounded-xl p-5 mb-6 text-white">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Resumo do agendamento</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-0.5">Serviço</p>
                    <p className="text-sm font-bold truncate">{selectedService.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-0.5">Profissional</p>
                    <p className="text-sm font-bold truncate">{selectedProfessional.name.split(' ')[0]}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-0.5">Data & Hora</p>
                    <p className="text-sm font-bold">{format(selectedSlot.start, "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <h2 className="text-lg font-bold text-zinc-900">Seus dados</h2>
                <p className="text-sm text-zinc-500">Confirme seus dados para finalizar.</p>
              </div>

              <form onSubmit={handleBooking} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <input
                      type="text" required value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <input
                      type="tel" required value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-white border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Observações <span className="text-zinc-300 normal-case font-normal">(opcional)</span></label>
                  <textarea
                    value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-white border border-zinc-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all min-h-[80px] resize-none"
                    placeholder="Alguma informação adicional?"
                  />
                </div>

                {business.show_address && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Endereço de atendimento</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                      <input
                        type="text" required value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-white border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
                        placeholder="Rua, número, bairro..."
                      />
                    </div>
                  </div>
                )}

                {business.show_reference && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Foto de referência <span className="text-zinc-300 normal-case font-normal">(opcional)</span></label>
                    <div className="relative">
                      <div className={cn(
                        "w-full rounded-xl bg-zinc-50 border-2 border-dashed border-zinc-200 transition-all overflow-hidden flex flex-col items-center justify-center min-h-[100px] relative hover:bg-zinc-100 cursor-pointer",
                        referenceFile && "p-3"
                      )}>
                        {referenceFile ? (
                          <div className="flex items-center gap-3 w-full">
                            <img src={URL.createObjectURL(referenceFile)} alt="Ref" className="w-14 h-14 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-zinc-700 truncate">{referenceFile.name}</p>
                            </div>
                            <button type="button" onClick={() => setReferenceFile(null)} className="p-1.5 bg-red-100 text-red-500 rounded-lg hover:bg-red-200">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-zinc-300 mb-1.5" />
                            <p className="text-xs text-zinc-400 font-medium">Enviar foto de referência</p>
                          </>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => setReferenceFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit" disabled={booking}
                  className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
                >
                  {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {booking ? 'Confirmando...' : reschedulingAppointment ? 'Confirmar Novo Horário' : 'Confirmar Agendamento'}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 5: SUCCESS (Receipt/Voucher) */}
          {step === 'success' && selectedService && selectedProfessional && selectedSlot && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              {/* Confetti-like header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900">Agendamento Confirmado!</h2>
                <p className="text-zinc-500 text-sm mt-1">Sua reserva foi realizada com sucesso.</p>
              </div>

              {/* Receipt/Voucher card */}
              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xl">
                {/* Receipt header */}
                <div className="bg-zinc-50 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Comprovante</p>
                      <h3 className="text-zinc-900 font-bold text-lg mt-0.5 capitalize">{business.name}</h3>
                    </div>
                    {business.logo_url && (
                      <img src={business.logo_url} alt={business.name} className="w-12 h-12 rounded-xl object-cover border border-zinc-200" />
                    )}
                  </div>
                </div>

                {/* Dashed divider */}
                <div className="border-t border-dashed border-zinc-200 mx-6" />

                {/* Receipt body */}
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Data</p>
                      <p className="text-sm font-bold text-zinc-900 capitalize">
                        {format(selectedSlot.start, "EEEE", { locale: ptBR })}
                      </p>
                      <p className="text-sm font-bold text-zinc-900">
                        {format(selectedSlot.start, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Horário</p>
                      <p className="text-2xl font-bold text-zinc-900">{format(selectedSlot.start, 'HH:mm')}</p>
                      <p className="text-xs text-zinc-500">até {format(selectedSlot.end, 'HH:mm')}</p>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Serviço</p>
                      <p className="text-sm font-bold text-zinc-900">{selectedService.name}</p>
                      <p className="text-xs text-zinc-500">{selectedService.duration_minutes} min</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Profissional</p>
                      <p className="text-sm font-bold text-zinc-900">{selectedProfessional.name}</p>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100" />

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Cliente</p>
                    <p className="text-sm font-bold text-zinc-900">{formData.name}</p>
                    {formData.phone && <p className="text-xs text-zinc-500">{formData.phone}</p>}
                  </div>

                  {selectedService.price !== null && Number(selectedService.price) > 0 && (
                    <>
                      <div className="h-px bg-zinc-100" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-zinc-500">Valor do serviço</span>
                        <span className="text-xl font-bold text-zinc-900">
                          R$ {Number(selectedService.price).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Receipt footer */}
                <div className="bg-zinc-50 border-t border-dashed border-zinc-200 px-6 py-4 flex items-center justify-between">
                  <p className="text-[10px] text-zinc-400">Status</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    Confirmado
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setStep('service');
                    setSelectedService(null);
                    setSelectedProfessional(null);
                    setSelectedSlot(null);
                  }}
                  className="bg-white border border-zinc-200 text-zinc-700 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-50 transition-all"
                >
                  Novo Agendamento
                </button>
                <button
                  onClick={handleSignOut}
                  className="bg-zinc-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-black transition-all"
                >
                  Finalizar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

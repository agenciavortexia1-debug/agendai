import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Appointment, Business } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  MapPin,
  XCircle,
  LogOut,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User
} from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function ClientPortal() {
  const [appointments, setAppointments] = useState<(Appointment & { business: Business })[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate('/auth');
      } else {
        loadAppointments(session.user.id);
      }
    });
  }, [navigate]);

  async function loadAppointments(userId: string) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, business:businesses(*)')
        .eq('client_id', userId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    setCancellingId(id);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      setAppointments(prev => prev.map(app =>
        app.id === id ? { ...app, status: 'cancelled' } : app
      ));
    } catch (err) {
      alert('Erro ao cancelar agendamento');
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
      </div>
    );
  }

  const upcoming = appointments.filter(app =>
    app.status === 'confirmed' && isAfter(parseISO(app.start_time), new Date())
  );

  const past = appointments.filter(app =>
    app.status === 'cancelled' || !isAfter(parseISO(app.start_time), new Date())
  );

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2">Meus Agendamentos</h1>
            <p className="text-black/40">Gerencie seus horários marcados</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-black/5">
              <div className="w-8 h-8 bg-[#5A5A40]/10 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-[#5A5A40]" />
              </div>
              <span className="text-sm font-medium">{session?.user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-3 bg-white text-red-500 rounded-xl hover:bg-red-50 transition-colors border border-black/5"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-sans font-semibold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#5A5A40]" />
              Próximos Agendamentos
            </h2>

            {upcoming.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcoming.map(app => (
                  <motion.div
                    key={app.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 relative overflow-hidden group"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#f5f5f0] rounded-xl flex items-center justify-center overflow-hidden">
                          {app.business.logo_url ? (
                            <img src={app.business.logo_url} alt={app.business.name} className="w-full h-full object-cover" />
                          ) : (
                            <Calendar className="w-6 h-6 text-black/20" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-sans font-semibold text-lg">{app.business.name}</h3>
                          <p className="text-xs text-black/40 uppercase tracking-widest font-sans font-medium">Confirmado</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-3 text-black/60">
                        <Calendar className="w-5 h-5 text-[#5A5A40]" />
                        <span className="text-sm">{format(parseISO(app.start_time), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center gap-3 text-black/60">
                        <Clock className="w-5 h-5 text-[#5A5A40]" />
                        <span className="text-sm">{format(parseISO(app.start_time), "HH:mm")}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleCancel(app.id)}
                        disabled={cancellingId === app.id}
                        className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-sans font-semibold hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {cancellingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Cancelar
                      </button>
                      <button
                        onClick={() => navigate(`/b/${app.business.slug}`)}
                        className="flex-1 bg-[#5A5A40] text-white py-3 rounded-xl font-sans font-semibold hover:bg-[#4a4a35] transition-all flex items-center justify-center gap-2"
                      >
                        Remarcar
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-black/10">
                <p className="text-black/30">Você não tem agendamentos futuros.</p>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-sans font-semibold mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-black/20" />
              Histórico
            </h2>

            <div className="bg-white rounded-[32px] overflow-hidden border border-black/5 shadow-sm">
              {past.length > 0 ? (
                <div className="divide-y divide-black/5">
                  {past.map(app => (
                    <div key={app.id} className="p-6 flex items-center justify-between hover:bg-[#f5f5f0]/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#f5f5f0] rounded-lg flex items-center justify-center text-black/20">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-sans font-semibold">{app.business.name}</p>
                          <p className="text-xs text-black/40">
                            {format(parseISO(app.start_time), "d 'de' MMM, HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {app.status === 'cancelled' ? (
                          <span className="text-[10px] font-sans font-medium uppercase tracking-widest text-red-400 bg-red-50 px-2 py-1 rounded-lg">Cancelado</span>
                        ) : (
                          <span className="text-[10px] font-sans font-medium uppercase tracking-widest text-black/20 bg-black/[0.02] px-2 py-1 rounded-lg">Concluído</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-black/30">Nenhum histórico encontrado.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

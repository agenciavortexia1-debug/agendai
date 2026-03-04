import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { BusinessHour, Business } from '../types';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { cn } from '../lib/utils';

const WEEKDAYS = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
];

export default function BusinessHours({ session }: { session: Session }) {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (businessData) {
        setBusiness(businessData);
        const { data: hoursData } = await supabase
          .from('business_hours')
          .select('*')
          .eq('business_id', businessData.id)
          .order('weekday', { ascending: true });

        if (hoursData && hoursData.length > 0) {
          setHours(hoursData);
        } else {
          // Initialize default hours
          const defaultHours = WEEKDAYS.map((_, i) => ({
            business_id: businessData.id,
            weekday: i,
            open_time: '09:00',
            close_time: '18:00',
            is_closed: i === 0 || i === 6 // Closed on weekends by default
          })) as BusinessHour[];
          setHours(defaultHours);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('business_hours')
        .upsert(
          hours.map(({ id, ...rest }) => rest),
          { onConflict: 'business_id,weekday' }
        );

      if (error) throw error;
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar horários');
    } finally {
      setSaving(false);
    }
  };

  const updateHour = (index: number, field: keyof BusinessHour, value: any) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setHours(newHours);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A5A40]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-all duration-300">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto pb-24 md:pb-10">
        <div className="max-w-2xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-black/40 hover:text-black transition-colors mb-4 md:mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Dashboard
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-zinc-200"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-sans font-semibold">Horários de Atendimento</h1>
                <p className="text-zinc-400 text-xs">Defina quando você está disponível para receber clientes</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {hours.map((hour, index) => (
                <div key={index} className={cn(
                  "flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all gap-2 sm:gap-0",
                  hour.is_closed ? "bg-zinc-50 border-zinc-100 opacity-60" : "bg-white border-zinc-200 shadow-sm"
                )}>
                  <div className="flex items-center gap-3 w-full sm:w-32">
                    <button
                      onClick={() => updateHour(index, 'is_closed', !hour.is_closed)}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                        hour.is_closed ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
                      )}
                    >
                      {hour.is_closed ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </button>
                    <span className="font-sans font-semibold text-sm">{WEEKDAYS[hour.weekday]}</span>
                    <div className="sm:hidden ml-auto">
                      <span className={cn(
                        "text-[9px] font-sans font-medium uppercase tracking-widest px-2 py-0.5 rounded-full",
                        hour.is_closed ? "bg-red-100 text-red-500" : "bg-emerald-100 text-emerald-500"
                      )}>
                        {hour.is_closed ? 'Fechado' : 'Aberto'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-[9px] font-sans font-medium text-zinc-300 uppercase w-8 sm:w-auto">Abre</span>
                      <input
                        type="time"
                        disabled={hour.is_closed}
                        value={hour.open_time}
                        onChange={(e) => updateHour(index, 'open_time', e.target.value)}
                        className="flex-1 sm:flex-none bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary disabled:opacity-50"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-[9px] font-sans font-medium text-zinc-300 uppercase w-8 sm:w-auto">Fecha</span>
                      <input
                        type="time"
                        disabled={hour.is_closed}
                        value={hour.close_time}
                        onChange={(e) => updateHour(index, 'close_time', e.target.value)}
                        className="flex-1 sm:flex-none bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="hidden sm:block w-20 text-right">
                    <span className={cn(
                      "text-[10px] font-sans font-medium uppercase tracking-widest",
                      hour.is_closed ? "text-red-400" : "text-emerald-500"
                    )}>
                      {hour.is_closed ? 'Fechado' : 'Aberto'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary text-white py-4 rounded-xl font-sans font-semibold hover:bg-zinc-800 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Salvar Horários</>}
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

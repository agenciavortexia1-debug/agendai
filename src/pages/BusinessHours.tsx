import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { BusinessHour, Business } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { cn } from '../lib/utils';

const WEEKDAYS = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function BusinessHours({ session }: { session: Session }) {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
          const defaultHours = WEEKDAYS.map((_, i) => ({
            business_id: businessData.id,
            weekday: i,
            open_time: '09:00',
            close_time: '18:00',
            is_closed: i === 0 || i === 6, // Dom e Sáb fechados por padrão
            has_break: false,
            break_start: '12:00',
            break_end: '13:00',
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
    setSaved(false);
    try {
      // Optimistic: atualiza UI imediatamente
      const { error } = await supabase
        .from('business_hours')
        .upsert(
          hours.map(({ id, ...rest }) => rest),
          { onConflict: 'business_id,weekday' }
        );

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar horários');
    } finally {
      setSaving(false);
    }
  };

  const updateHour = (index: number, field: keyof BusinessHour, value: any) => {
    setHours(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-all duration-300">
      <Sidebar />
      <main className="flex-1 p-3 md:p-10 overflow-y-auto pb-20 md:pb-8 bg-zinc-50/50">
        <div className="max-w-2xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-4 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden"
          >
            {/* Header compacto */}
            <div className="flex items-center gap-3 p-4 md:p-6 border-b border-zinc-100">
              <div className="w-9 h-9 bg-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-sans font-semibold">Horários de Atendimento</h1>
                <p className="text-zinc-400 text-xs">Defina sua disponibilidade e intervalos</p>
              </div>
            </div>

            {/* Lista de dias */}
            <div className="divide-y divide-zinc-50">
              {hours.map((hour, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 md:p-4 transition-colors",
                    hour.is_closed ? "bg-zinc-50/60" : "bg-white"
                  )}
                >
                  {/* Linha principal: dia + toggle + horários */}
                  <div className="flex items-center gap-2">
                    {/* Toggle aberto/fechado */}
                    <button
                      onClick={() => updateHour(index, 'is_closed', !hour.is_closed)}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                        hour.is_closed ? "bg-red-50 text-red-400 hover:bg-red-100" : "bg-emerald-50 text-emerald-500 hover:bg-emerald-100"
                      )}
                      title={hour.is_closed ? 'Fechado — clique para abrir' : 'Aberto — clique para fechar'}
                    >
                      {hour.is_closed ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>

                    {/* Nome do dia */}
                    <span className={cn(
                      "font-sans font-semibold text-sm w-8 md:w-20 text-left flex-shrink-0",
                      hour.is_closed ? "text-zinc-400" : "text-zinc-800"
                    )}>
                      <span className="md:hidden">{WEEKDAYS_SHORT[hour.weekday]}</span>
                      <span className="hidden md:inline">{WEEKDAYS[hour.weekday]}</span>
                    </span>

                    {hour.is_closed ? (
                      <span className="text-xs text-zinc-400 italic ml-1">Fechado</span>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap flex-1">
                        <input
                          type="time"
                          value={hour.open_time}
                          onChange={(e) => updateHour(index, 'open_time', e.target.value)}
                          className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all w-[100px]"
                        />
                        <span className="text-zinc-300 text-xs">até</span>
                        <input
                          type="time"
                          value={hour.close_time}
                          onChange={(e) => updateHour(index, 'close_time', e.target.value)}
                          className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all w-[100px]"
                        />

                        {/* Botão intervalo */}
                        <button
                          onClick={() => updateHour(index, 'has_break', !hour.has_break)}
                          className={cn(
                            "ml-auto flex items-center gap-1 text-[10px] font-sans font-medium uppercase tracking-wider px-2 py-1.5 rounded-lg transition-all",
                            hour.has_break
                              ? "bg-amber-50 text-amber-600 border border-amber-200"
                              : "bg-zinc-50 text-zinc-400 border border-zinc-200 hover:border-amber-200 hover:text-amber-500"
                          )}
                        >
                          <ChevronDown className={cn("w-3 h-3 transition-transform", hour.has_break && "rotate-180")} />
                          Intervalo
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Campos de intervalo (expansível) */}
                  <AnimatePresence>
                    {!hour.is_closed && hour.has_break && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 mt-2.5 pl-10 md:pl-[116px]">
                          <div className="w-1 h-6 bg-amber-200 rounded-full flex-shrink-0" />
                          <span className="text-[10px] font-sans font-medium text-amber-600 uppercase tracking-wider w-14 flex-shrink-0">Intervalo</span>
                          <input
                            type="time"
                            value={hour.break_start || '12:00'}
                            onChange={(e) => updateHour(index, 'break_start', e.target.value)}
                            className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all w-[100px]"
                          />
                          <span className="text-zinc-300 text-xs">até</span>
                          <input
                            type="time"
                            value={hour.break_end || '13:00'}
                            onChange={(e) => updateHour(index, 'break_end', e.target.value)}
                            className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all w-[100px]"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Botão salvar */}
            <div className="p-3 md:p-5 border-t border-zinc-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "w-full py-3 rounded-lg font-sans font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70",
                  saved
                    ? "bg-emerald-500 text-white"
                    : "bg-primary text-white hover:bg-zinc-800 shadow-md"
                )}
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  : saved
                    ? <><Check className="w-4 h-4" /> Salvo com sucesso!</>
                    : <><Save className="w-4 h-4" /> Salvar Horários</>
                }
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

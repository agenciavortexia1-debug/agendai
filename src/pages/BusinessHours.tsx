import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { BusinessHour, Business } from '../types';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Loader2,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { cn } from '../lib/utils';

const WEEKDAYS = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
];

// Ordenar: segunda primeiro (i=1), domingo por último (i=0)
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function BusinessHours({ session }: { session: Session }) {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Estado do intervalo global (aplicado a todos os dias abertos)
  const [hasBreak, setHasBreak] = useState(false);
  const [breakStart, setBreakStart] = useState('12:00');
  const [breakEnd, setBreakEnd] = useState('13:00');

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
          // Inicializa intervalo global a partir do primeiro dia com intervalo
          const dayWithBreak = hoursData.find(h => h.has_break);
          if (dayWithBreak) {
            setHasBreak(true);
            setBreakStart(dayWithBreak.break_start || '12:00');
            setBreakEnd(dayWithBreak.break_end || '13:00');
          }
        } else {
          const defaultHours = WEEKDAYS.map((_, i) => ({
            business_id: businessData.id,
            weekday: i,
            open_time: '09:00',
            close_time: '18:00',
            is_closed: i === 0, // só domingo fechado por padrão
            has_break: false,
            break_start: '12:00',
            break_end: '13:00',
          })) as unknown as BusinessHour[];
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
      const dataToSave = hours.map(({ id, ...rest }) => ({
        ...rest,
        has_break: hasBreak,
        break_start: breakStart,
        break_end: breakEnd,
      }));

      const { error } = await supabase
        .from('business_hours')
        .upsert(dataToSave, { onConflict: 'business_id,weekday' });

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

  const updateHour = (weekday: number, field: keyof BusinessHour, value: any) => {
    setHours(prev => {
      const next = [...prev];
      const idx = next.findIndex(h => h.weekday === weekday);
      if (idx !== -1) next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const getHour = (weekday: number) => hours.find(h => h.weekday === weekday);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-all duration-300">
      <Sidebar />
      <main className="flex-1 p-4 md:p-10 overflow-y-auto pb-20 md:pb-8 bg-zinc-50/50">
        <div className="max-w-5xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-6 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Horários de Funcionamento</h1>
              <p className="text-zinc-500 text-sm mt-1">Configure os dias e horários de atendimento do seu negócio.</p>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] divide-y lg:divide-y-0 lg:divide-x divide-zinc-100">

                {/* Coluna Esquerda: Dias e Horários */}
                <div className="p-6 md:p-8">
                  <h2 className="text-sm font-semibold text-zinc-900 mb-6">Dias e Horários</h2>

                  <div className="space-y-1">
                    {WEEKDAY_ORDER.map(weekday => {
                      const hour = getHour(weekday);
                      if (!hour) return null;
                      const isOpen = !hour.is_closed;

                      return (
                        <div
                          key={weekday}
                          className={cn(
                            "flex items-center gap-4 py-3 px-4 rounded-xl transition-colors group",
                            isOpen ? "hover:bg-zinc-50" : "opacity-60 hover:bg-zinc-50"
                          )}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => updateHour(weekday, 'is_closed', isOpen)}
                            className={cn(
                              "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all",
                              isOpen
                                ? "bg-blue-500 border-blue-500"
                                : "border-zinc-300 bg-white"
                            )}
                          >
                            {isOpen && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </button>

                          {/* Nome do dia */}
                          <span className={cn(
                            "text-sm font-medium w-20 flex-shrink-0",
                            isOpen ? "text-zinc-900" : "text-zinc-400"
                          )}>
                            {WEEKDAYS[weekday]}
                          </span>

                          {/* Horários */}
                          {isOpen ? (
                            <div className="flex items-center gap-2 flex-1">
                              <div className="relative">
                                <input
                                  type="time"
                                  value={hour.open_time}
                                  onChange={(e) => updateHour(weekday, 'open_time', e.target.value)}
                                  className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm text-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-[110px] font-medium"
                                />
                              </div>
                              <span className="text-zinc-400 text-xs font-medium">às</span>
                              <div className="relative">
                                <input
                                  type="time"
                                  value={hour.close_time}
                                  onChange={(e) => updateHour(weekday, 'close_time', e.target.value)}
                                  className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm text-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-[110px] font-medium"
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 flex-1">Fechado</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Coluna Direita: Intervalos */}
                <div className="p-6 md:p-8">
                  <h2 className="text-sm font-semibold text-zinc-900 mb-6">Intervalos</h2>

                  <div className={cn(
                    "rounded-xl border p-5 transition-all",
                    hasBreak ? "border-zinc-200 bg-white" : "border-dashed border-zinc-200 bg-zinc-50/50"
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-700">Horário de Almoço</span>
                      {/* Toggle */}
                      <button
                        onClick={() => setHasBreak(!hasBreak)}
                        className={cn(
                          "relative w-10 h-5 rounded-full transition-colors flex-shrink-0",
                          hasBreak ? "bg-zinc-900" : "bg-zinc-200"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
                          hasBreak ? "left-5" : "left-0.5"
                        )} />
                      </button>
                    </div>

                    {hasBreak && (
                      <div className="flex items-center gap-2 mt-4">
                        <input
                          type="time"
                          value={breakStart}
                          onChange={(e) => setBreakStart(e.target.value)}
                          className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm text-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-[110px] font-medium"
                        />
                        <span className="text-zinc-400 text-xs font-medium">às</span>
                        <input
                          type="time"
                          value={breakEnd}
                          onChange={(e) => setBreakEnd(e.target.value)}
                          className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm text-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-[110px] font-medium"
                        />
                      </div>
                    )}

                    <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                      {hasBreak
                        ? "Este intervalo será aplicado a todos os dias de funcionamento."
                        : "Ative para configurar um intervalo de almoço global."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer com botão */}
              <div className="px-6 md:px-8 py-5 border-t border-zinc-100 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-70",
                    saved
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  )}
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                    : saved
                      ? <><Check className="w-4 h-4" /> Salvo!</>
                      : <><Save className="w-4 h-4" /> Salvar Configurações</>
                  }
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

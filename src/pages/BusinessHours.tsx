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
      <div className="h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-zinc-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {/* Compact Top Bar */}
        <header className="flex-shrink-0 bg-white border-b border-zinc-100 px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/dashboard" className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 rounded-lg transition-all flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-sm font-sans font-bold text-zinc-900 leading-tight">Horários de Funcionamento</h1>
              <p className="text-[10px] text-zinc-400 leading-tight hidden sm:block">Dias e horários de atendimento</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-70",
              saved ? "bg-emerald-500 text-white" : "bg-zinc-900 text-white hover:bg-zinc-800"
            )}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}</span>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] divide-y lg:divide-y-0 lg:divide-x divide-zinc-100">

              {/* Left: Days + Hours */}
              <div className="p-5 md:p-6">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Dias e Horários</h2>
                <div className="space-y-1">
                  {WEEKDAY_ORDER.map(weekday => {
                    const hour = getHour(weekday);
                    if (!hour) return null;
                    const isOpen = !hour.is_closed;

                    return (
                      <div
                        key={weekday}
                        className={cn(
                          "flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors group",
                          isOpen ? "hover:bg-zinc-50" : "opacity-60 hover:bg-zinc-50"
                        )}
                      >
                        <button
                          onClick={() => updateHour(weekday, 'is_closed', isOpen)}
                          className={cn(
                            "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all",
                            isOpen ? "bg-primary border-primary" : "border-zinc-300 bg-white"
                          )}
                        >
                          {isOpen && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </button>
                        <span className={cn(
                          "text-sm font-medium w-16 flex-shrink-0",
                          isOpen ? "text-zinc-900" : "text-zinc-400"
                        )}>
                          {WEEKDAYS[weekday]}
                        </span>
                        {isOpen ? (
                          <div className="flex items-center gap-2 flex-1 flex-wrap">
                            <input
                              type="time"
                              value={hour.open_time}
                              onChange={(e) => updateHour(weekday, 'open_time', e.target.value)}
                              className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm text-zinc-700 focus:ring-2 focus:ring-primary focus:border-transparent transition-all w-[100px] font-medium"
                            />
                            <span className="text-zinc-400 text-xs">às</span>
                            <input
                              type="time"
                              value={hour.close_time}
                              onChange={(e) => updateHour(weekday, 'close_time', e.target.value)}
                              className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm text-zinc-700 focus:ring-2 focus:ring-primary focus:border-transparent transition-all w-[100px] font-medium"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 flex-1">Fechado</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Intervals */}
              <div className="p-5 md:p-6">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Intervalos</h2>
                <div className={cn(
                  "rounded-xl border p-4 transition-all",
                  hasBreak ? "border-zinc-200 bg-white" : "border-dashed border-zinc-200 bg-zinc-50/50"
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-zinc-700">Horário de Almoço</span>
                    <button
                      onClick={() => setHasBreak(!hasBreak)}
                      className={cn(
                        "relative w-9 h-5 rounded-full transition-colors flex-shrink-0",
                        hasBreak ? "bg-primary" : "bg-zinc-200"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
                        hasBreak ? "left-4" : "left-0.5"
                      )} />
                    </button>
                  </div>
                  {hasBreak && (
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        type="time"
                        value={breakStart}
                        onChange={(e) => setBreakStart(e.target.value)}
                        className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm text-zinc-700 focus:ring-2 focus:ring-primary w-[100px] font-medium"
                      />
                      <span className="text-zinc-400 text-xs">às</span>
                      <input
                        type="time"
                        value={breakEnd}
                        onChange={(e) => setBreakEnd(e.target.value)}
                        className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm text-zinc-700 focus:ring-2 focus:ring-primary w-[100px] font-medium"
                      />
                    </div>
                  )}
                  <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">
                    {hasBreak
                      ? "Aplicado a todos os dias de funcionamento."
                      : "Ative para configurar um intervalo de almoço."}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Business } from '../types';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Loader2,
  Globe,
  Building2,
  Timer,
  Image as ImageIcon,
  Plus,
  X,
  Scissors
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function BusinessSettings({ session }: { session: Session }) {
  const [business, setBusiness] = useState<Partial<Business>>({
    name: '',
    slug: '',
    appointment_duration_minutes: 30,
    logo_url: null,
    services: []
  });
  const [newService, setNewService] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadBusiness() {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (data) setBusiness(data);
      setLoading(false);
    }
    loadBusiness();
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('businesses')
        .upsert({
          ...business,
          user_id: session.user.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addService = () => {
    if (!newService.trim()) return;
    const currentServices = business.services || [];
    if (currentServices.includes(newService.trim())) return;
    setBusiness({ ...business, services: [...currentServices, newService.trim()] });
    setNewService('');
  };

  const removeService = (serviceToRemove: string) => {
    setBusiness({
      ...business,
      services: (business.services || []).filter(s => s !== serviceToRemove)
    });
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
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-black/40 hover:text-black transition-colors mb-6 md:mb-8">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Dashboard
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 md:p-10 shadow-sm border border-zinc-200"
          >
            <div className="flex items-center gap-4 mb-8 md:mb-10">
              <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-sans font-semibold">Configurações do Negócio</h1>
                <p className="text-zinc-400 text-sm">Personalize como os clientes veem sua empresa</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Nome do Negócio</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                    <input
                      type="text"
                      required
                      value={business.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        const newSlug = newName.toLowerCase()
                          .trim()
                          .replace(/[^\w\s-]/g, '')
                          .replace(/[\s_-]+/g, '-')
                          .replace(/^-+|-+$/g, '');
                        setBusiness({ ...business, name: newName, slug: newSlug });
                      }}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all text-zinc-900"
                      placeholder="Ex: Barbearia do João"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Slug (Link Público)</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                    <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl">
                      <span className="pl-12 pr-1 text-zinc-400 font-medium hidden sm:inline">agendai.com/b/</span>
                      <input
                        type="text"
                        readOnly
                        value={business.slug}
                        className="flex-1 bg-transparent border-none py-4 pr-4 focus:ring-0 transition-all text-zinc-400 cursor-not-allowed font-medium"
                        placeholder="seu-negocio"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 ml-1 italic">Este será o endereço que seus clientes usarão para agendar.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Duração do Atendimento (minutos)</label>
                  <div className="relative">
                    <Timer className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                    <select
                      value={business.appointment_duration_minutes}
                      onChange={(e) => setBusiness({ ...business, appointment_duration_minutes: Number(e.target.value) })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all appearance-none"
                    >
                      <option value={15}>15 minutos</option>
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>1 hora</option>
                      <option value={90}>1 hora e 30 minutos</option>
                      <option value={120}>2 horas</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-100">
                  <label className="text-xs font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Serviços Oferecidos</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Scissors className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                      <input
                        type="text"
                        value={newService}
                        onChange={(e) => setNewService(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all"
                        placeholder="Ex: Corte de Cabelo"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addService}
                      className="bg-primary text-white p-4 rounded-xl hover:bg-zinc-800 transition-all shadow-md"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(business.services || []).map((service) => (
                      <div
                        key={service}
                        className="flex items-center gap-2 bg-white border border-zinc-200 px-4 py-2 rounded-xl shadow-sm group"
                      >
                        <span className="text-sm font-medium">{service}</span>
                        <button
                          type="button"
                          onClick={() => removeService(service)}
                          className="text-zinc-300 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!business.services || business.services.length === 0) && (
                      <p className="text-sm text-zinc-400 italic ml-1">Nenhum serviço adicionado ainda.</p>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 ml-1 italic">Estes serviços aparecerão como opções para seus clientes no momento do agendamento.</p>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center bg-red-50 p-4 rounded-2xl border border-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-white py-4 rounded-xl font-sans font-semibold hover:bg-zinc-800 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Salvar Alterações</>}
              </button>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

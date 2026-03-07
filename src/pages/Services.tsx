import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Business } from '../types';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Plus,
  X,
  Scissors,
  Briefcase
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Services({ session }: { session: Session }) {
  const [business, setBusiness] = useState<Partial<Business>>({
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          services: business.services,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id);

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
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-sans font-semibold">Serviços</h1>
                <p className="text-zinc-400 text-sm">Gerencie os serviços que você oferece aos seus clientes</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-sans font-medium uppercase tracking-widest text-black/40 ml-1">Adicionar Novo Serviço</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Scissors className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
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
                
                <div className="space-y-2">
                  <label className="text-xs font-sans font-medium uppercase tracking-widest text-black/40 ml-1">Serviços Atuais</label>
                  <div className="flex flex-wrap gap-2">
                    {(business.services || []).map((service) => (
                      <div 
                        key={service}
                        className="flex items-center gap-2 bg-zinc-50 px-4 py-3 rounded-xl group transition-all hover:bg-zinc-100 border border-zinc-200"
                      >
                        <span className="font-sans font-semibold">{service}</span>
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
                      <div className="w-full text-center py-12 bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
                        <p className="text-sm text-zinc-400 italic">Nenhum serviço adicionado ainda.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center bg-red-50 p-4 rounded-2xl border border-red-100">
                  {error}
                </p>
              )}

              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-primary text-white py-4 rounded-xl font-sans font-semibold hover:bg-zinc-800 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Salvar Alterações</>}
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Service } from '../types';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Scissors,
  Briefcase,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const toast = {
  success: (msg: string) => alert(msg),
  error: (msg: string) => alert('Erro: ' + msg),
};

export default function Services({ session }: { session: Session }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Form State
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [newServicePrice, setNewServicePrice] = useState('');

  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: bData } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (bData) {
          setBusinessId(bData.id);
          const { data: sData } = await supabase
            .from('services')
            .select('*')
            .eq('business_id', bData.id)
            .order('name');

          if (sData) setServices(sData);
        }
      } catch (err) {
        console.error("Error loading services", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [session]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim() || !businessId) return;

    setSavingId('new');
    try {
      const { data, error } = await supabase
        .from('services')
        .insert([{
          business_id: businessId,
          name: newServiceName.trim(),
          duration_minutes: parseInt(newServiceDuration) || 30,
          price: newServicePrice ? parseFloat(newServicePrice) : null
        }])
        .select()
        .single();

      if (error) throw error;

      setServices([...services, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewServiceName('');
      setNewServiceDuration('30');
      setNewServicePrice('');
      toast.success('Serviço adicionado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar serviço');
    } finally {
      setSavingId(null);
    }
  };

  const handleRemoveService = async (id: string) => {
    if (!confirm('Deseja realmente remover este serviço? O histórico de agendamentos será mantido, mas ele deixará de aparecer para clientes e profissionais.')) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setServices(services.filter(s => s.id !== id));
      toast.success('Serviço removido!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover serviço');
    } finally {
      setDeletingId(null);
    }
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
      <main className="flex-1 p-6 md:p-10 overflow-y-auto pb-24 md:pb-10 bg-zinc-50/50">
        <div className="max-w-4xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-6 md:mb-8">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Dashboard
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-zinc-900">Serviços</h1>
                <p className="text-zinc-500 mt-1">Defina os serviços, duração e preço do seu estabelecimento.</p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Form for New Service */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 sticky top-8">
                <h3 className="font-semibold text-zinc-900 mb-4">Adicionar Serviço</h3>
                <form onSubmit={handleAddService} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Nome</label>
                    <div className="relative">
                      <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                        placeholder="Ex: Corte de Cabelo"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Duração (minutos)</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={newServiceDuration}
                        onChange={(e) => setNewServiceDuration(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Preço Base (Opcional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingId === 'new'}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-70 mt-2"
                  >
                    {savingId === 'new' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Adicionar</>}
                  </button>
                </form>
              </div>
            </div>

            {/* List of Services */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200">
                <h3 className="font-semibold text-zinc-900 mb-4">Catálogo de Serviços ({services.length})</h3>

                {services.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                    <Briefcase className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">Você ainda não tem serviços cadastrados.<br />Adicione o seu primeiro serviço ao lado.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all bg-white group"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="font-semibold text-zinc-900 truncate">{service.name}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1 text-xs text-zinc-500 font-medium bg-zinc-100 px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3" /> {service.duration_minutes} min
                            </span>
                            {service.price !== null && (
                              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                R$ {Number(service.price).toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveService(service.id)}
                          disabled={deletingId === service.id}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          title="Remover serviço"
                        >
                          {deletingId === service.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

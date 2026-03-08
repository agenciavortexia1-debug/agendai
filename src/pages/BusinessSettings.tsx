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
  Scissors,
  Upload,
  MapPin,
  Info
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { cn } from '../lib/utils';

export default function BusinessSettings({ session }: { session: Session }) {
  const [business, setBusiness] = useState<Partial<Business>>({
    name: '',
    slug: '',
    appointment_duration_minutes: 30,
    logo_url: null,
    services: [],
    show_address: false,
    show_reference: false
  });
  const [newService, setNewService] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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

      if (data) {
        setBusiness({
          ...data,
          show_address: data.show_address ?? false,
          show_reference: data.show_reference ?? false
        });
      }
      setLoading(false);
    }
    loadBusiness();
  }, [session]);

  // Auto-slug logic
  useEffect(() => {
    if (business.name && !business.id) { // Only auto-slug for NEW businesses or if you want it always forced
      const generatedSlug = business.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setBusiness(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [business.name, business.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let currentLogoUrl = business.logo_url;

      // Upload logo if a new file was selected
      if (logoFile) {
        setUploadingLogo(true);
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${session.user.id}/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath);

        currentLogoUrl = publicUrl;
      }

      const { error } = await supabase
        .from('businesses')
        .upsert({
          ...business,
          logo_url: currentLogoUrl,
          user_id: session.user.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      alert('Configurações salvas com sucesso!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
      setUploadingLogo(false);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-all duration-300 bg-zinc-50/50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-10">
        <div className="max-w-4xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Dashboard
          </Link>

          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-zinc-900">Configurações do Negócio</h1>
                <p className="text-zinc-500 text-sm">Gerencie as informações principais da sua empresa</p>
              </div>
            </div>
          </header>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Coluna da Esquerda: Dados Básicos */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-6">
                  <h3 className="font-sans font-bold text-zinc-900 flex items-center gap-2">
                    <Info className="w-4 h-4 text-zinc-400" /> Informações Gerais
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 ml-1">Nome do Negócio</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                        <input
                          type="text"
                          required
                          value={business.name}
                          onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all font-medium"
                          placeholder="Ex: Barbearia do João"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 ml-1">Slug (Link Público)</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                        <input
                          type="text"
                          required
                          readOnly
                          value={business.slug}
                          className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-3 pl-12 pr-4 text-zinc-500 font-medium cursor-not-allowed"
                          placeholder="seu-negocio"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 ml-1">Duração Padrão do Atendimento</label>
                    <div className="relative">
                      <Timer className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                      <select
                        value={business.appointment_duration_minutes}
                        onChange={(e) => setBusiness({ ...business, appointment_duration_minutes: Number(e.target.value) })}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all appearance-none font-medium"
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
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-6">
                  <h3 className="font-sans font-bold text-zinc-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-zinc-400" /> Campos no Agendamento
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <label className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-100 transition-colors">
                      <div>
                        <p className="font-semibold text-zinc-900 text-sm">Solicitar Endereço</p>
                        <p className="text-[10px] text-zinc-500">O cliente informa onde será.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={business.show_address}
                        onChange={(e) => setBusiness({ ...business, show_address: e.target.checked })}
                        className="w-5 h-5 accent-zinc-900"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-100 transition-colors">
                      <div>
                        <p className="font-semibold text-zinc-900 text-sm">Solicitar Foto de Referência</p>
                        <p className="text-[10px] text-zinc-500">O cliente pode enviar uma imagem de inspiração.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={business.show_reference}
                        onChange={(e) => setBusiness({ ...business, show_reference: e.target.checked })}
                        className="w-5 h-5 accent-zinc-900"
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-6">
                  <h3 className="font-sans font-bold text-zinc-900 flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-zinc-400" /> Serviços Oferecidos
                  </h3>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Scissors className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                      <input
                        type="text"
                        value={newService}
                        onChange={(e) => setNewService(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary transition-all font-medium"
                        placeholder="Ex: Corte de Cabelo"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addService}
                      className="bg-zinc-900 text-white px-6 rounded-xl hover:bg-black transition-all shadow-md font-bold"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(business.services || []).map((service) => (
                      <div
                        key={service}
                        className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg group"
                      >
                        <span className="text-sm font-semibold text-zinc-700">{service}</span>
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
                      <p className="text-xs text-zinc-400 italic">Nenhum serviço adicionado ainda.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna da Direita: Logo */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 space-y-6">
                  <h3 className="font-sans font-bold text-zinc-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-zinc-400" /> Logo da Empresa
                  </h3>

                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="w-full aspect-square rounded-2xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-center p-4 group-hover:bg-zinc-100 transition-all overflow-hidden">
                        {(logoFile || business.logo_url) ? (
                          <img
                            src={logoFile ? URL.createObjectURL(logoFile) : business.logo_url!}
                            alt="Logo preview"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-zinc-300 mb-2" />
                            <p className="text-xs text-zinc-400 font-medium">Enviar Logo</p>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      {(logoFile || business.logo_url) && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          {logoFile && (
                            <button
                              type="button"
                              onClick={() => setLogoFile(null)}
                              className="p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 text-center italic">A logo aparecerá na sua página pública de reservas.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-500 text-xs font-semibold">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving || uploadingLogo}
                    className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]"
                  >
                    {saving || uploadingLogo ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> {uploadingLogo ? 'Enviando...' : 'Salvando...'}</>
                    ) : (
                      <><Save className="w-5 h-5" /> Salvar Configurações</>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

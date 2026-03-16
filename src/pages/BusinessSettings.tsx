import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Business } from '../types';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Loader2,
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

  // Função de sanitização do slug
  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  // Auto-slug ao mudar nome (apenas se o slug ainda não foi editado manualmente ou é negócio novo)
  const handleNameChange = (name: string) => {
    const newSlug = generateSlug(name);
    setBusiness(prev => ({ ...prev, name, slug: newSlug }));
  };


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
              <h1 className="text-sm font-sans font-bold text-zinc-900 truncate leading-tight">Configurações do Negócio</h1>
              <p className="text-[10px] text-zinc-400 leading-tight hidden sm:block">Informações principais da sua empresa</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {error && (
              <span className="text-xs text-red-500 font-medium hidden sm:block">{error}</span>
            )}
            <button
              type="submit"
              form="settings-form"
              disabled={saving || uploadingLogo}
              className="flex items-center gap-1.5 bg-zinc-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-black transition-all text-xs disabled:opacity-70"
            >
              {saving || uploadingLogo ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{saving || uploadingLogo ? (uploadingLogo ? 'Enviando...' : 'Salvando...') : 'Salvar'}</span>
            </button>
          </div>
        </header>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto">
          <form id="settings-form" onSubmit={handleSave}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-full">

              {/* Left: main config */}
              <div className="lg:col-span-2 p-4 md:p-6 space-y-4 border-r border-zinc-100">

                {/* Informações Gerais */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-zinc-200 space-y-4">
                  <h3 className="text-xs font-sans font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" /> Informações Gerais
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">Nome do Negócio</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                        <input
                          type="text"
                          required
                          value={business.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-primary transition-all font-medium"
                          placeholder="Ex: Barbearia do João"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-0.5">Duração Padrão</label>
                      <div className="relative">
                        <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                        <select
                          value={business.appointment_duration_minutes}
                          onChange={(e) => setBusiness({ ...business, appointment_duration_minutes: Number(e.target.value) })}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-primary transition-all appearance-none font-medium"
                        >
                          <option value={15}>15 minutos</option>
                          <option value={30}>30 minutos</option>
                          <option value={45}>45 minutos</option>
                          <option value={60}>1 hora</option>
                          <option value={90}>1h 30min</option>
                          <option value={120}>2 horas</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campos no Agendamento */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-zinc-200 space-y-3">
                  <h3 className="text-xs font-sans font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" /> Campos no Agendamento
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-100 transition-colors">
                      <div>
                        <p className="font-semibold text-zinc-900 text-xs">Solicitar Endereço</p>
                        <p className="text-[10px] text-zinc-500">O cliente informa onde será.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={business.show_address}
                        onChange={(e) => setBusiness({ ...business, show_address: e.target.checked })}
                        className="w-4 h-4 accent-zinc-900"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-100 transition-colors">
                      <div>
                        <p className="font-semibold text-zinc-900 text-xs">Solicitar Foto de Referência</p>
                        <p className="text-[10px] text-zinc-500">Imagem de inspiração do cliente.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={business.show_reference}
                        onChange={(e) => setBusiness({ ...business, show_reference: e.target.checked })}
                        className="w-4 h-4 accent-zinc-900"
                      />
                    </label>
                  </div>
                </div>

                {/* Serviços */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-zinc-200 space-y-3">
                  <h3 className="text-xs font-sans font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5" /> Serviços Oferecidos
                  </h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                      <input
                        type="text"
                        value={newService}
                        onChange={(e) => setNewService(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-2 focus:ring-primary transition-all font-medium"
                        placeholder="Ex: Corte de Cabelo"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addService}
                      className="bg-zinc-900 text-white px-4 rounded-lg hover:bg-black transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(business.services || []).map((service) => (
                      <div key={service} className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-lg">
                        <span className="text-xs font-semibold text-zinc-700">{service}</span>
                        <button type="button" onClick={() => removeService(service)} className="text-zinc-300 hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(!business.services || business.services.length === 0) && (
                      <p className="text-[11px] text-zinc-400 italic">Nenhum serviço adicionado ainda.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Logo + Save */}
              <div className="p-4 md:p-6 h-full flex flex-col">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-zinc-200 flex flex-col flex-1 h-full min-h-0">
                  <h3 className="text-xs font-sans font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                    <ImageIcon className="w-3.5 h-3.5" /> Logo da Empresa
                  </h3>
                  <div className="relative group flex-1 flex flex-col">
                    <div className="w-full flex-1 rounded-xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-center p-4 group-hover:bg-zinc-100 transition-all overflow-hidden">
                      {(logoFile || business.logo_url) ? (
                        <img
                          src={logoFile ? URL.createObjectURL(logoFile) : business.logo_url!}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <>
                          <Upload className="w-7 h-7 text-zinc-300 mb-1.5" />
                          <p className="text-xs text-zinc-400 font-medium">Enviar Logo</p>
                          <p className="text-[10px] text-zinc-300">PNG, JPG, SVG</p>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    {logoFile && (
                      <button type="button" onClick={() => setLogoFile(null)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 text-center mt-4">Aparece na página pública de agendamento</p>
                </div>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-500 text-xs font-medium mt-4">{error}</div>
                )}
              </div>

            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

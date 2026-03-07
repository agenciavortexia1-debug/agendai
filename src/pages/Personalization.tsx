import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Business } from '../types';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Loader2,
  Palette,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { cn } from '../lib/utils';

export default function Personalization({ session }: { session: Session }) {
  const [business, setBusiness] = useState<Partial<Business>>({
    logo_url: null,
    primary_color: '#5A5A40',
    font_family: 'font-sans',
    bg_color: '#f5f5f0',
    text_color: '#141414'
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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
          primary_color: data.primary_color || '#5A5A40',
          font_family: data.font_family || 'font-sans',
          bg_color: data.bg_color || '#f5f5f0',
          text_color: data.text_color || '#141414'
        });
      }
      setLoading(false);
    }
    loadBusiness();
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let currentLogoUrl = business.logo_url;

      // Upload logo if a new file was selected
      if (logoFile) {
        setUploading(true);
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

      setBusiness(prev => ({ ...prev, logo_url: currentLogoUrl }));
      setLogoFile(null);
      alert('Personalização salva com sucesso!');
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setError('Erro de conexão com o Supabase. Verifique se as credenciais (URL e Key) estão corretas nos segredos do projeto.');
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
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

      <main className="flex-1 p-6 md:p-10 overflow-y-auto pb-24 md:pb-10">
        <div className="max-w-2xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-black/40 hover:text-black transition-colors mb-6 md:mb-8">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Dashboard
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-6 md:p-10 shadow-sm border border-zinc-200"
          >
            <div className="flex items-center gap-4 mb-8 md:mb-10">
              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
                <Palette className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-sans font-semibold">Personalização</h1>
                <p className="text-zinc-400 text-sm">Defina a identidade visual da sua página de agendamento</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
              <div className="space-y-6">
                {/* Color Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-xs font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Cor Principal</label>
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                      <input
                        type="color"
                        value={business.primary_color || '#18181b'}
                        onChange={(e) => setBusiness({ ...business, primary_color: e.target.value })}
                        className="w-12 h-12 rounded-lg border-none cursor-pointer bg-transparent"
                      />
                      <div>
                        <p className="font-medium text-sm">{business.primary_color}</p>
                        <p className="text-[10px] text-zinc-400">Botões e destaques.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Cor de Fundo</label>
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                      <input
                        type="color"
                        value={business.bg_color || '#f8fafc'}
                        onChange={(e) => setBusiness({ ...business, bg_color: e.target.value })}
                        className="w-12 h-12 rounded-lg border-none cursor-pointer bg-transparent"
                      />
                      <div>
                        <p className="font-medium text-sm">{business.bg_color}</p>
                        <p className="text-[10px] text-zinc-400">Fundo do sistema.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Cor do Texto</label>
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                      <input
                        type="color"
                        value={business.text_color || '#18181b'}
                        onChange={(e) => setBusiness({ ...business, text_color: e.target.value })}
                        className="w-12 h-12 rounded-lg border-none cursor-pointer bg-transparent"
                      />
                      <div>
                        <p className="font-medium text-sm">{business.text_color}</p>
                        <p className="text-[10px] text-zinc-400">Cor dos textos principais.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Font Selection */}
                <div className="space-y-4">
                  <label className="text-xs font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Tipografia</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'font-sans', name: 'Inter', preview: 'Aa', class: 'font-sans' },
                      { id: 'font-display', name: 'Jakarta', preview: 'Aa', class: 'font-display' },
                      { id: 'font-mono', name: 'JetBrains', preview: 'Aa', class: 'font-mono' },
                    ].map((font) => (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => setBusiness({ ...business, font_family: font.id })}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all text-center",
                          business.font_family === font.id
                            ? "border-primary bg-primary/5"
                            : "border-zinc-100 hover:border-zinc-200 bg-zinc-50/50"
                        )}
                      >
                        <span className={cn("text-2xl block mb-1", font.class)}>{font.preview}</span>
                        <span className="text-xs font-medium text-zinc-400">{font.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-4">
                  <label className="text-xs font-sans font-medium uppercase tracking-widest text-zinc-400 ml-1">Logo da Empresa</label>
                  <div className="space-y-4">
                    <div className="p-8 border-2 border-dashed border-zinc-200 rounded-lg flex flex-col items-center justify-center text-center bg-zinc-50/50 hover:bg-zinc-50 transition-all cursor-pointer relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform border border-zinc-100">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-zinc-600">
                        {logoFile ? logoFile.name : 'Clique ou arraste para enviar sua logo'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-2">PNG, JPG ou SVG (Máx. 2MB)</p>
                    </div>

                    {(business.logo_url || logoFile) && (
                      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white rounded-lg border border-zinc-200 shadow-sm">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center border border-zinc-100 flex-shrink-0">
                          <img
                            src={logoFile ? URL.createObjectURL(logoFile) : business.logo_url!}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <p className="text-sm font-semibold text-zinc-800">Prévia da Logo</p>
                          <p className="text-xs text-zinc-400 mt-1">Assim ela aparecerá no topo da sua página de agendamento.</p>
                          {logoFile && (
                            <button
                              type="button"
                              onClick={() => setLogoFile(null)}
                              className="text-xs text-red-500 font-semibold mt-2 hover:underline"
                            >
                              Remover arquivo selecionado
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center bg-red-50 p-4 rounded-xl border border-red-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || uploading}
                className="w-full bg-primary text-white py-4 rounded-lg font-sans font-semibold hover:bg-zinc-800 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving || uploading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {uploading ? 'Enviando Logo...' : 'Salvando...'}</>
                ) : (
                  <><Save className="w-5 h-5" /> Salvar Personalização</>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

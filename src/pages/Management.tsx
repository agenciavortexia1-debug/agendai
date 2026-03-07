import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Users,
    Briefcase,
    Lock,
    Plus,
    Edit2,
    Trash2,
    Shield,
    Camera,
    Loader2,
    Check,
    X,
    Smartphone,
    ChevronRight
} from 'lucide-react';
import { Professional, Service } from '../types';
import Sidebar from '../components/Sidebar';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const toast = {
    success: (msg: string) => alert(msg),
    error: (msg: string) => alert('Erro: ' + msg),
};

export default function Management({ session }: { session: any }) {
    const [activeTab, setActiveTab] = useState<'staff' | 'services' | 'access'>('staff');
    const [loading, setLoading] = useState(true);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [profServicesData, setProfServicesData] = useState<any[]>([]);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'employee' as 'owner' | 'employee',
        avatar_url: '',
        login_user: '',
        login_pass: '',
        access_screens: ['agenda'],
        selectedServices: [] as string[]
    });

    const AVAILABLE_SCREENS = [
        { id: 'agenda', label: 'Ver Agenda' },
        { id: 'staff', label: 'Gerenciar Equipe/Serviços' },
        { id: 'analytics', label: 'Ver Financeiro/KPIs' },
        { id: 'settings', label: 'Configurações' }
    ];

    useEffect(() => {
        fetchData();
    }, [session]);

    async function fetchData() {
        try {
            setLoading(true);
            const { data: businessData } = await supabase
                .from('businesses')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (businessData) {
                const [profRes, servRes, psRes] = await Promise.all([
                    supabase.from('professionals').select('*').eq('business_id', businessData.id).order('created_at'),
                    supabase.from('services').select('*').eq('business_id', businessData.id).order('name'),
                    supabase.from('professional_services').select('*')
                ]);

                setProfessionals(profRes.data || []);
                setServices(servRes.data || []);
                setProfServicesData(psRes.data || []);
            }
        } catch (error) {
            console.error('Error fetching management data:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!e.target.files || e.target.files.length === 0) return;
            setUploading(true);
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
            toast.success('Foto carregada!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: businessData } = await supabase.from('businesses').select('id').eq('user_id', session.user.id).single();
            if (!businessData) return;

            if (activeTab === 'staff' || activeTab === 'access') {
                const payload = {
                    business_id: businessData.id,
                    name: formData.name,
                    email: formData.email || null,
                    phone: formData.phone || null,
                    role: formData.role,
                    avatar_url: formData.avatar_url,
                    access_screens: ['agenda'], // Fixado para colaboradores
                    login_user: formData.login_user || null,
                    login_pass: formData.login_pass || null
                };

                let profId;
                if (editingItem) {
                    await supabase.from('professionals').update(payload).eq('id', editingItem.id);
                    profId = editingItem.id;
                } else {
                    const { data } = await supabase.from('professionals').insert([payload]).select().single();
                    profId = data?.id;
                }

                // Update relations
                if (profId) {
                    await supabase.from('professional_services').delete().eq('professional_id', profId);
                    if (formData.selectedServices.length > 0) {
                        await supabase.from('professional_services').insert(
                            formData.selectedServices.map(id => ({ professional_id: profId, service_id: id }))
                        );
                    }
                }
            } else if (activeTab === 'services') {
                const payload = {
                    business_id: businessData.id,
                    name: formData.name,
                    duration_minutes: parseInt(formData.phone) || 30, // Using phone field temp for duration in service form
                    price: parseFloat(formData.email) || 0 // Using email field temp for price
                };
                if (editingItem) {
                    await supabase.from('services').update(payload).eq('id', editingItem.id);
                } else {
                    await supabase.from('services').insert([payload]);
                }
            }

            setIsModalOpen(false);
            fetchData();
            toast.success('Salvo com sucesso!');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: string, table: string) => {
        if (!confirm('Tem certeza?')) return;
        await supabase.from(table).delete().eq('id', id);
        fetchData();
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50/50">
            <Sidebar />
            <main className="flex-1 p-4 md:p-10 pb-24 md:pb-10 overflow-y-auto">
                <header className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-zinc-900">Gestão do Negócio</h1>
                    <p className="text-zinc-500 text-sm mt-1">Configure sua equipe, serviços e acessos.</p>
                </header>

                {/* Custom Tabs */}
                <div className="flex p-1 bg-zinc-100 rounded-xl mb-8 max-w-md w-full">
                    {[
                        { id: 'staff', label: 'Equipe', icon: Users },
                        { id: 'services', label: 'Serviços', icon: Briefcase },
                        { id: 'access', label: 'Acesso', icon: Lock },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
                                activeTab === tab.id ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                        <h2 className="font-display font-bold text-zinc-900">
                            {activeTab === 'staff' && "Membros da Equipe"}
                            {activeTab === 'services' && "Catálogo de Serviços"}
                            {activeTab === 'access' && "Controle de Credenciais"}
                        </h2>
                        <button
                            onClick={() => {
                                setEditingItem(null);
                                setFormData({
                                    name: '', email: '', phone: '', role: 'employee', avatar_url: '',
                                    login_user: '', login_pass: '', access_screens: ['agenda'], selectedServices: []
                                });
                                setIsModalOpen(true);
                            }}
                            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-semibold hover:bg-zinc-800 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {activeTab === 'staff' ? 'Novo Membro' : 'Novo Serviço'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode='popLayout'>
                            {/* STAFF LIST */}
                            {activeTab === 'staff' && professionals.map((prof) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={prof.id}
                                    className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:border-primary/20 transition-all group"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex-shrink-0 relative overflow-hidden ring-4 ring-zinc-50">
                                            {prof.avatar_url ? (
                                                <img src={prof.avatar_url} alt={prof.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Users className="w-6 h-6 m-auto absolute inset-0 text-zinc-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-zinc-900 truncate">{prof.name}</h3>
                                            <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">{prof.role === 'owner' ? 'Dono' : 'Equipe'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingItem(prof);
                                                setFormData({
                                                    ...formData,
                                                    name: prof.name,
                                                    email: prof.email || '',
                                                    phone: prof.phone || '',
                                                    role: prof.role as any,
                                                    avatar_url: prof.avatar_url || '',
                                                    access_screens: prof.access_screens || ['agenda'],
                                                    selectedServices: profServicesData.filter(ps => ps.professional_id === prof.id).map(ps => ps.service_id)
                                                });
                                                setIsModalOpen(true);
                                            }}
                                            className="flex-1 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold transition-all"
                                        >Editar</button>
                                        <button
                                            onClick={() => handleDelete(prof.id, 'professionals')}
                                            className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                                        ><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </motion.div>
                            ))}

                            {/* SERVICES LIST */}
                            {activeTab === 'services' && services.map((svc) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={svc.id}
                                    className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:border-blue-200 transition-all group"
                                >
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                        <Briefcase className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-zinc-900">{svc.name}</h3>
                                    <div className="flex items-center gap-2 mt-2 mb-6">
                                        <span className="text-xs font-semibold px-2 py-1 bg-zinc-100 rounded text-zinc-500">{svc.duration_minutes} min</span>
                                        <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-600 rounded">R$ {svc.price}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingItem(svc);
                                                setFormData({
                                                    ...formData,
                                                    name: svc.name,
                                                    phone: svc.duration_minutes?.toString() || '30',
                                                    email: svc.price?.toString() || '0'
                                                });
                                                setIsModalOpen(true);
                                            }}
                                            className="flex-1 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold transition-all"
                                        >Editar</button>
                                        <button
                                            onClick={() => handleDelete(svc.id, 'services')}
                                            className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                                        ><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </motion.div>
                            ))}

                            {/* ACCESS LIST */}
                            {activeTab === 'access' && professionals.map((prof) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={`access-${prof.id}`}
                                    className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 font-bold">
                                            {prof.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-zinc-900">{prof.name}</h3>
                                            <p className="text-xs text-zinc-500 italic">{prof.login_user || 'Sem usuário'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingItem(prof);
                                            setFormData({
                                                ...formData,
                                                name: prof.name,
                                                login_user: prof.login_user || '',
                                                login_pass: prof.login_pass || '',
                                                access_screens: prof.access_screens || ['agenda']
                                            });
                                            setIsModalOpen(true);
                                        }}
                                        className="p-2 text-zinc-400 hover:bg-zinc-50 rounded-lg transition-all"
                                    >
                                        <Lock className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            {/* Unified Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="p-6 border-b border-zinc-100 flex justify-between items-center sticky top-0 bg-white z-20">
                            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600">
                                {activeTab === 'staff' && (editingItem ? 'Editar Perfil' : 'Novo Colaborador')}
                                {activeTab === 'services' && (editingItem ? 'Editar Serviço' : 'Novo Serviço')}
                                {activeTab === 'access' && "Configurar Acesso"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                            {activeTab === 'staff' && (
                                <>
                                    <div className="flex justify-center mb-8">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-3xl bg-zinc-100 flex items-center justify-center overflow-hidden ring-4 ring-white shadow-xl transition-transform group-hover:scale-105">
                                                {formData.avatar_url ? (
                                                    <img src={formData.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="w-10 h-10 text-zinc-300" />
                                                )}
                                                {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin" /></div>}
                                            </div>
                                            <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-zinc-900 text-white rounded-2xl flex items-center justify-center cursor-pointer hover:bg-black transition-all shadow-lg active:scale-90">
                                                <Camera className="w-5 h-5" />
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nome</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                                                placeholder="Nome do colaborador"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Cargo</label>
                                                <select
                                                    value={formData.role}
                                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-zinc-900 outline-none"
                                                >
                                                    <option value="employee">Funcionário</option>
                                                    <option value="owner">Dono/Admin</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">WhatsApp</label>
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-zinc-900 outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Services Selection */}
                                        <div className="space-y-3 pt-4 border-t border-zinc-100">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Serviços que realiza</label>
                                            {services.length === 0 ? (
                                                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                                    Cadastre serviços antes de vinculá-los aos colaboradores.
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[150px] overflow-y-auto px-1 custom-scrollbar">
                                                    {services.map(svc => (
                                                        <label key={svc.id} className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer hover:border-zinc-300 transition-all select-none">
                                                            <div className="relative flex items-center justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    className="peer appearance-none w-5 h-5 border-2 border-zinc-300 rounded focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 transition-all checked:bg-zinc-900 checked:border-zinc-900 cursor-pointer"
                                                                    checked={formData.selectedServices.includes(svc.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setFormData(prev => ({ ...prev, selectedServices: [...prev.selectedServices, svc.id] }));
                                                                        } else {
                                                                            setFormData(prev => ({ ...prev, selectedServices: prev.selectedServices.filter(id => id !== svc.id) }));
                                                                        }
                                                                    }}
                                                                />
                                                                <Check className="w-3 h-3 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                            </div>
                                                            <span className="text-sm font-semibold text-zinc-700">{svc.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'services' && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nome do Serviço</label>
                                        <input
                                            type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-zinc-900"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                                            <input
                                                type="number" step="0.01" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Duração (minutos)</label>
                                            <input
                                                type="number" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'access' && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-indigo-50 rounded-2xl flex gap-3 items-start border border-indigo-100">
                                        <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-indigo-900">Acesso Restrito</p>
                                            <p className="text-xs text-indigo-700 leading-relaxed">Crie um usuário e senha para que {formData.name} acesse o sistema pelo link do colaborador.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Usuário de Acesso</label>
                                            <input
                                                type="text" value={formData.login_user} onChange={e => setFormData({ ...formData, login_user: e.target.value })}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Ex: joao.silva"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Senha</label>
                                            <input
                                                type="password" value={formData.login_pass} onChange={e => setFormData({ ...formData, login_pass: e.target.value })}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-6 sticky bottom-0 bg-white z-10">
                                <button
                                    type="submit"
                                    className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-black transition-all"
                                >
                                    Salvar Informações
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

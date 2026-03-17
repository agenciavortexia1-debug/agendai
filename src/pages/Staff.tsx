import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Shield, Users, AlertCircle } from 'lucide-react';
import { Professional, Service } from '../types';

const toast = {
    success: (msg: string) => alert(msg),
    error: (msg: string) => alert('Erro: ' + msg),
};

export default function Staff({ session }: { session: any }) {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'owner' | 'employee'>('employee');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [accessScreens, setAccessScreens] = useState<string[]>(['agenda']); // Default access
    const [commissionType, setCommissionType] = useState<'percent' | 'fixed' | 'none'>('none');
    const [commissionValue, setCommissionValue] = useState('');

    const AVAILABLE_SCREENS = [
        { id: 'Agenda', label: 'Ver Agenda' },
        { id: 'Equipe', label: 'Gerenciar Equipe' },
        { id: 'Análises', label: 'Ver Financeiro/KPIs' },
        { id: 'Personalização', label: 'Personalização' },
        { id: 'Configurações', label: 'Configurações (Serviços e Horários)' }
    ];

    useEffect(() => {
        fetchData();
    }, [session]);

    async function fetchData() {
        try {
            setLoading(true);
            // Get Business ID
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (businessError) throw businessError;

            // Get Professionals
            const { data: profData, error: profError } = await supabase
                .from('professionals')
                .select('*')
                .eq('business_id', businessData.id)
                .order('created_at', { ascending: true });

            if (profError) throw profError;
            setProfessionals(profData || []);

            // Get Services
            const { data: servData, error: servError } = await supabase
                .from('services')
                .select('*')
                .eq('business_id', businessData.id)
                .order('name');

            // For now, if services fails (maybe table is empty or just migrated), ignore and fallback to empty
            if (!servError) {
                setServices(servData || []);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    }

    const openModal = (professional?: Professional) => {
        if (professional) {
            setEditingProfessional(professional);
            setName(professional.name);
            setEmail(professional.email || '');
            setPhone(professional.phone || '');
            setRole(professional.role);
            setAccessScreens(professional.access_screens || []);
            setCommissionType((professional.commission_type as any) || 'none');
            setCommissionValue(professional.commission_value !== null && professional.commission_value !== undefined ? String(professional.commission_value) : '');
            // Pre-select services will require an extra fetch, let's keep it simple for now or fetch it during editing
            fetchProfessionalServices(professional.id);
        } else {
            setEditingProfessional(null);
            setName('');
            setEmail('');
            setPhone('');
            setRole('employee');
            setAccessScreens(['agenda']);
            setSelectedServices([]);
            setCommissionType('none');
            setCommissionValue('');
        }
        setIsModalOpen(true);
    };

    const fetchProfessionalServices = async (professionalId: string) => {
        const { data } = await supabase
            .from('professional_services')
            .select('service_id')
            .eq('professional_id', professionalId);

        if (data) {
            setSelectedServices(data.map(d => d.service_id));
        }
    };

    const toggleScreenAccess = (screenId: string) => {
        setAccessScreens(prev =>
            prev.includes(screenId)
                ? prev.filter(id => id !== screenId)
                : [...prev, screenId]
        );
    };

    const toggleService = (serviceId: string) => {
        setSelectedServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            toast.error('O nome é obrigatório');
            return;
        }

        try {
            const { data: businessData } = await supabase
                .from('businesses')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (!businessData) throw new Error('Business not found');

            const professionalData = {
                business_id: businessData.id,
                name,
                email: email || null,
                phone: phone || null,
                role,
                access_screens: role === 'owner' ? AVAILABLE_SCREENS.map(s => s.id) : accessScreens,
                commission_type: commissionType,
                commission_value: commissionType !== 'none' && commissionValue ? parseFloat(commissionValue) : null,
            };

            let newProfessionalId;

            if (editingProfessional) {
                const { error } = await supabase
                    .from('professionals')
                    .update(professionalData)
                    .eq('id', editingProfessional.id);
                if (error) throw error;
                newProfessionalId = editingProfessional.id;
                toast.success('Profissional atualizado!');
            } else {
                const { data, error } = await supabase
                    .from('professionals')
                    .insert([professionalData])
                    .select('id')
                    .single();
                if (error) throw error;
                if (data) newProfessionalId = data.id;
                toast.success('Profissional adicionado!');
            }

            // Update Professional Services
            if (newProfessionalId) {
                // First delete all existing relations
                await supabase
                    .from('professional_services')
                    .delete()
                    .eq('professional_id', newProfessionalId);

                // Then insert new ones
                if (selectedServices.length > 0) {
                    const serviceInserts = selectedServices.map(serviceId => ({
                        professional_id: newProfessionalId,
                        service_id: serviceId
                    }));
                    await supabase.from('professional_services').insert(serviceInserts);
                }
            }

            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving professional:', error);
            toast.error(error.message || 'Erro ao salvar profissional');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este profissional? Todos os seus agendamentos futuros não atrelados ficarão sem profissional.')) return;
        try {
            const { error } = await supabase.from('professionals').delete().eq('id', id);
            if (error) throw error;
            toast.success('Profissional removido');
            fetchData();
        } catch (error) {
            console.error('Error deleting professional:', error);
            toast.error('Erro ao remover profissional');
        }
    };

    if (loading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto bg-zinc-50/50">
            <div className="max-w-5xl mx-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-zinc-900">Equipe</h1>
                        <p className="text-zinc-500 mt-1">Gerencie seus colaboradores, permissões e serviços.</p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Colaborador
                    </button>
                </div>

                {professionals.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-zinc-400" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900">Nenhum colaborador</h3>
                        <p className="text-zinc-500 mt-1">Adicione o primeiro membro da sua equipe.</p>
                        <button
                            onClick={() => openModal()}
                            className="mt-6 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-block"
                        >
                            Adicionar Colaborador
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-medium text-zinc-500">Nome</th>
                                    <th className="px-6 py-4 text-sm font-medium text-zinc-500">Contato</th>
                                    <th className="px-6 py-4 text-sm font-medium text-zinc-500">Perfil</th>
                                    <th className="px-6 py-4 text-sm font-medium text-zinc-500 w-24">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                                {professionals.map((prof) => (
                                    <tr key={prof.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-medium">
                                                    {prof.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-zinc-900">{prof.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="text-zinc-900">{prof.phone || '-'}</div>
                                                <div className="text-zinc-500">{prof.email || '-'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {prof.role === 'owner' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                    <Shield className="w-3 h-3" /> Dono
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    <Users className="w-3 h-3" /> Funcionário
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openModal(prof)}
                                                    className="p-2 text-zinc-400 hover:text-primary transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(prof.id)}
                                                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-xl">
                        <div className="p-6 border-b border-zinc-200 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-zinc-900">
                                {editingProfessional ? 'Editar Colaborador' : 'Novo Colaborador'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-zinc-400 hover:text-zinc-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-8 flex-1">
                            <form id="staff-form" onSubmit={handleSubmit} className="space-y-6">

                                {/* Dados Básicos */}
                                <section>
                                    <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Dados Pessoais</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo *</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary placeholder-zinc-400"
                                                placeholder="Ex: João da Silva"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary placeholder-zinc-400"
                                                placeholder="joao@exemplo.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone/WhatsApp</label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary placeholder-zinc-400"
                                                placeholder="(11) 99999-9999"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <hr className="border-zinc-200" />

                                {/* Comissão */}
                                <section>
                                    <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Comissão por Atendimento</h3>
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {(['none', 'percent', 'fixed'] as const).map(ct => (
                                            <label
                                                key={ct}
                                                className={`flex flex-col items-center gap-1 p-3 border rounded-xl cursor-pointer transition-all ${commissionType === ct ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="commissionType"
                                                    value={ct}
                                                    checked={commissionType === ct}
                                                    onChange={() => setCommissionType(ct)}
                                                    className="sr-only"
                                                />
                                                <span className="font-semibold text-zinc-900 text-sm">
                                                    {ct === 'none' ? 'Sem comissão' : ct === 'percent' ? 'Percentual' : 'Valor fixo'}
                                                </span>
                                                <span className="text-[10px] text-zinc-500">
                                                    {ct === 'none' ? 'Não se aplica' : ct === 'percent' ? '% sobre o serviço' : 'R$ por atendimento'}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    {commissionType !== 'none' && (
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium text-zinc-700">
                                                {commissionType === 'percent' ? 'Percentual (%)' : 'Valor por atendimento (R$)'}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step={commissionType === 'percent' ? '1' : '0.01'}
                                                max={commissionType === 'percent' ? '100' : undefined}
                                                value={commissionValue}
                                                onChange={e => setCommissionValue(e.target.value)}
                                                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary placeholder-zinc-400"
                                                placeholder={commissionType === 'percent' ? 'Ex: 30' : 'Ex: 50.00'}
                                            />
                                        </div>
                                    )}
                                </section>

                                <hr className="border-zinc-200" />

                                {/* Serviços Associados */}
                                <section>
                                    <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-2">Quais serviços este colaborador realiza?</h3>
                                    {services.length === 0 ? (
                                        <div className="bg-amber-50 text-amber-800 p-4 rounded-lg flex items-start gap-3 mt-4">
                                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                            <p className="text-sm">Você ainda não tem serviços cadastrados com a nova estrutura. Vá até a aba "Serviços" para criar seu catálogo primeiro.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                            {services.map(service => (
                                                <label
                                                    key={service.id}
                                                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedServices.includes(service.id) ? 'border-primary bg-primary/5' : 'border-zinc-200 hover:bg-zinc-50'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 w-4 h-4 text-primary rounded border-zinc-300 focus:ring-primary"
                                                        checked={selectedServices.includes(service.id)}
                                                        onChange={() => toggleService(service.id)}
                                                    />
                                                    <div>
                                                        <div className="font-medium text-sm text-zinc-900">{service.name}</div>
                                                        <div className="text-xs text-zinc-500">{service.duration_minutes} min</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <hr className="border-zinc-200" />

                                {/* Permissões */}
                                <section>
                                    <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Nível de Acesso</h3>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${role === 'employee' ? 'border-blue-500 bg-blue-50/50' : 'border-zinc-200 hover:border-zinc-300'}`}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value="employee"
                                                checked={role === 'employee'}
                                                onChange={() => setRole('employee')}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <div>
                                                <div className="font-medium text-zinc-900 flex items-center gap-2">Funcionário <Users className="w-4 h-4 text-blue-500" /></div>
                                                <p className="text-xs text-zinc-500 mt-1">Acesso restrito, focado na rotina.</p>
                                            </div>
                                        </label>
                                        <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${role === 'owner' ? 'border-purple-500 bg-purple-50/50' : 'border-zinc-200 hover:border-zinc-300'}`}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value="owner"
                                                checked={role === 'owner'}
                                                onChange={() => setRole('owner')}
                                                className="text-purple-600 focus:ring-purple-500"
                                            />
                                            <div>
                                                <div className="font-medium text-zinc-900 flex items-center gap-2">Administrador <Shield className="w-4 h-4 text-purple-500" /></div>
                                                <p className="text-xs text-zinc-500 mt-1">Acesso total a todas as telas do sistema.</p>
                                            </div>
                                        </label>
                                    </div>

                                    {role === 'employee' && (
                                        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5">
                                            <p className="text-sm font-medium text-zinc-700 mb-3">Quais telas este funcionário pode visualizar?</p>
                                            <div className="space-y-3">
                                                {AVAILABLE_SCREENS.map(screen => (
                                                    <label key={screen.id} className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={accessScreens.includes(screen.id)}
                                                            onChange={() => toggleScreenAccess(screen.id)}
                                                            className="w-4 h-4 text-primary rounded border-zinc-300 focus:ring-primary"
                                                        />
                                                        <span className="text-sm text-zinc-700">{screen.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>

                            </form>
                        </div>

                        <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3 rounded-b-2xl sticky bottom-0">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 text-zinc-600 font-medium hover:bg-zinc-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="staff-form"
                                className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                {editingProfessional ? 'Salvar Alterações' : 'Adicionar Colaborador'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

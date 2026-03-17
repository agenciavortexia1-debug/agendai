export type Business = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  phone: string;
  address: string;
  created_at: string;
  logo_url: string;
  description: string;
  // WhatsApp
  whatsapp_habilitado?: boolean;
  msg_confirmacao?: string;
  msg_lembrete?: string;
  msg_cancelamento?: string;
  msg_pos_atendimento?: string;
  lembrete_horas_antes?: number[];
  // Pagamento PIX
  pagamento_habilitado?: boolean;
  abacatepay_api_key?: string;
  modo_cobranca?: 'total' | 'sinal';
  sinal_tipo?: 'percent' | 'fixed';
  sinal_valor?: number;
  pagamento_expiracao_min?: number;
};

export type BusinessHour = {
  id: string;
  business_id: string;
  weekday: number; // 0-6
  open_time: string; // HH:mm
  close_time: string; // HH:mm
  is_closed: boolean;
};

export type BlockedTime = {
  id: string;
  business_id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
};

export type Appointment = {
  id: string;
  business_id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  notes: string | null;
  service: string | null;
  client_id: string | null;
  address?: string | null;
  reference?: string | null;
  reference_image_url?: string | null;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
  updated_at?: string;
  // Pagamento
  status_pagamento?: 'pendente' | 'pago' | 'expirado' | 'isento';
  abacatepay_charge_id?: string | null;
  valor_pago?: number | null;
  pago_em?: string | null;
  expira_em?: string | null;
};

export type AvailableSlot = {
  start: Date;
  end: Date;
};

export type Professional = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'owner' | 'employee';
  avatar_url: string | null;
  access_screens: string[] | null;
  login_user: string | null;
  login_pass: string | null;
  created_at: string;
  // Comissão
  commission_type?: 'percent' | 'fixed' | 'none';
  commission_value?: number | null;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  created_at: string;
};

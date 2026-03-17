export type Business = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  font_family: string | null;
  bg_color: string | null;
  text_color: string | null;
  appointment_duration_minutes: number;
  services: string[] | null;
  show_address: boolean;
  show_reference: boolean;
  created_at: string;
  // WhatsApp (WAHA)
  whatsapp_habilitado?: boolean;
  waha_url?: string | null;
  waha_session?: string | null;
  waha_api_key?: string | null;
  msg_confirmacao?: string | null;
  msg_lembrete?: string | null;
  msg_cancelamento?: string | null;
  msg_pos_atendimento?: string | null;
  lembrete_horas_antes?: number[] | null;
  // Pagamento (AbacatePay)
  pagamento_habilitado?: boolean;
  abacatepay_api_key?: string | null;
  modo_cobranca?: 'total' | 'sinal' | null;
  sinal_tipo?: 'percent' | 'fixed' | null;
  sinal_valor?: number | null;
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

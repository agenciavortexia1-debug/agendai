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
  subscription_status?: string;
  stripe_customer_id?: string;
  plan_type?: string;
  created_at: string;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  price: number | null;
  created_at: string;
};

export type Professional = {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: 'owner' | 'employee';
  access_screens: string[];
  created_at: string;
};

export type ProfessionalService = {
  professional_id: string;
  service_id: string;
};

export type BusinessHour = {
  id: string;
  business_id: string;
  weekday: number; // 0-6
  open_time: string; // HH:mm
  close_time: string; // HH:mm
  is_closed: boolean;
  has_break: boolean;
  break_start: string | null; // HH:mm
  break_end: string | null;   // HH:mm
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
  professional_id: string | null;
  service_id: string | null;
  client_name: string;
  client_phone: string;
  client_email: string;
  notes: string | null;
  client_id: string | null;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled';
  attended: boolean | null;
  final_price: number | null;
  created_at: string;
  updated_at?: string;
};

export type AvailableSlot = {
  start: Date;
  end: Date;
};

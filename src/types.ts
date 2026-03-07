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
  created_at: string;
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
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
  updated_at?: string;
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
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  created_at: string;
};

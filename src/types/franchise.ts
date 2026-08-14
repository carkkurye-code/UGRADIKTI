export type AdminScope = 'global' | 'city' | 'franchise';

export interface City {
  id: string;
  name: string;
  plate_code: number;
  center_lat?: number | null;
  center_lng?: number | null;
  is_active: boolean;
  created_at?: string;
}

export interface Franchise {
  id: string;
  city_id: string;
  city_name?: string;
  name: string;
  company_title?: string | null;
  authorized_person?: string | null;
  phone?: string | null;
  email?: string | null;
  status: 'active' | 'suspended' | 'passive';
  revenue_share_percentage?: number;
  districts_covered?: string[];
  created_at?: string;
  updated_at?: string;
}

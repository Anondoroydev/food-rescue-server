export type UserRole = 'restaurant' | 'ngo' | 'admin';
export type FoodStatus = 'available' | 'requested' | 'collected' | 'expired';
export type FoodType = 'vegetarian' | 'non-vegetarian' | 'both';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'collected' | 'delivered';
export type DonationStatus = 'collected' | 'delivered' | 'cancelled';
export type NotificationType = 'food_posted' | 'request_received' | 'request_approved' | 'request_rejected' | 'reminder' | 'alert' | 'message';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  phone: string;
  address?: string;
  role: UserRole;
  organization_name?: string;
  latitude?: number;
  longitude?: number;
  profile_image?: string;
  is_active: boolean;
  reset_token?: string | null;
  reset_token_expiry?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Food {
  id: number;
  restaurant_id: number;
  food_name: string;
  description?: string;
  quantity: string;
  food_type: FoodType;
  image?: string;
  pickup_time?: string;
  pickup_date?: string;
  expiry_time?: Date | string;
  status: FoodStatus;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  // Joins
  restaurant_name?: string;
  organization_name?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

export interface FoodRequest {
  id: number;
  food_id: number;
  ngo_id: number;
  status: RequestStatus;
  request_message?: string;
  collection_time?: string;
  collection_date?: string;
  approved_at?: Date | null;
  rejected_at?: Date | null;
  collected_at?: Date | null;
  delivered_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  // Joins
  food_name?: string;
  restaurant_id?: number;
  restaurant_name?: string;
  ngo_name?: string;
  ngo_organization?: string;
}

export interface Donation {
  id: number;
  food_id: number;
  restaurant_id: number;
  ngo_id: number;
  request_id: number;
  quantity: string;
  collected_at?: Date | null;
  delivered_at?: Date | null;
  status: DonationStatus;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  // Joins
  food_name?: string;
  restaurant_name?: string;
  ngo_name?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  sender_id?: number | null;
  title: string;
  message: string;
  type: NotificationType;
  reference_id?: number | null;
  reference_type?: string | null;
  is_read: boolean;
  read_at?: Date | null;
  created_at: Date;
  sender_name?: string;
}

export interface Review {
  id: number;
  from_user_id: number;
  to_user_id: number;
  request_id: number;
  rating: number;
  comment?: string;
  created_at: Date;
  updated_at: Date;
  from_user_name?: string;
  to_user_name?: string;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  is_read: boolean;
  read_at?: Date | null;
  created_at: Date;
  sender_name?: string;
  receiver_name?: string;
}

export interface QRCodeData {
  id: number;
  request_id: number;
  qr_code: string;
  token: string;
  is_used: boolean;
  used_at?: Date | null;
  expiry_at?: Date | null;
  created_at: Date;
}

export interface FoodCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  created_at: Date;
}

export interface SystemLog {
  id: number;
  user_id?: number | null;
  action: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  user_name?: string;
}

export interface ExpressUserPayload {
  id: number;
  email: string;
  role: UserRole;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: ExpressUserPayload;
    }
  }
}

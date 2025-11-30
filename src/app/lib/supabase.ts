// Supabase Client - Direct database access from frontend
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for TypeScript
export interface DbLivestream {
  id: number;
  title: string;
  description: string | null;
  creator_wallet_address: string;
  stream_url: string | null;
  thumbnail_url: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  view_count: number;
  category: string | null;
  created_at: string;
  updated_at: string;
  avatar: string | null;
  github_url: string | null;
  market_address: string | null;
}

export interface DbMarketMetadata {
  id: number;
  contract_address: string;
  description: string | null;
  category: string | null;
  creator_wallet_address: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DbUser {
  id: number;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

// Default avatar URL
export const DEFAULT_AVATAR = "https://res.cloudinary.com/storagemanagementcontainer/image/upload/v1751747169/default-avatar_ynttwb.png";

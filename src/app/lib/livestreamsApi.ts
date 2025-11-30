// Livestreams API - Direct Supabase Access (No Backend Required)
import { supabase, DbLivestream, DEFAULT_AVATAR } from './supabase';
import type { LivestreamDataType } from '../../types/types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// Convert database row to LivestreamDataType
function toFrontendLivestream(db: DbLivestream): LivestreamDataType {
  return {
    id: db.id,
    title: db.title,
    description: db.description || '',
    creator_wallet_address: db.creator_wallet_address,
    stream_url: db.stream_url || '',
    thumbnail_url: db.thumbnail_url || '',
    status: db.status as LivestreamDataType['status'],
    start_time: db.start_time || '',
    end_time: db.end_time || '',
    view_count: db.view_count || 0,
    category: db.category || 'general',
    created_at: db.created_at,
    updated_at: db.updated_at,
    avatar: db.avatar || DEFAULT_AVATAR,
    github_url: db.github_url || 'https://github.com',
    market_address: db.market_address || undefined,
  };
}

/**
 * Get all livestreams with optional filtering
 */
export async function getAllLivestreams(filters?: {
  status?: string;
  creator_wallet_address?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<LivestreamDataType[]>> {
  try {
    let query = supabase
      .from('livestreams')
      .select('*')
      .order('start_time', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.creator_wallet_address) {
      query = query.eq('creator_wallet_address', filters.creator_wallet_address);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return {
        success: false,
        data: [],
        error: error.message,
        count: 0
      };
    }

    const livestreams = (data || []).map(toFrontendLivestream);
    
    return {
      success: true,
      data: livestreams,
      count: livestreams.length
    };
  } catch (error) {
    console.error('Error fetching livestreams:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      count: 0
    };
  }
}

/**
 * Get a livestream by ID
 */
export async function getLivestreamById(id: number): Promise<ApiResponse<LivestreamDataType>> {
  try {
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: toFrontendLivestream(data)
    };
  } catch (error) {
    console.error('Error fetching livestream:', error);
    throw error;
  }
}

/**
 * Create a new livestream
 */
export async function createLivestream(
  livestream: Omit<LivestreamDataType, 'id' | 'created_at' | 'updated_at' | 'view_count'>
): Promise<ApiResponse<LivestreamDataType>> {
  try {
    const { data, error } = await supabase
      .from('livestreams')
      .insert({
        title: livestream.title,
        description: livestream.description,
        creator_wallet_address: livestream.creator_wallet_address,
        stream_url: livestream.stream_url,
        thumbnail_url: livestream.thumbnail_url,
        status: livestream.status,
        start_time: livestream.start_time,
        end_time: livestream.end_time,
        category: livestream.category,
        avatar: livestream.avatar,
        github_url: livestream.github_url,
        market_address: livestream.market_address,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: toFrontendLivestream(data)
    };
  } catch (error) {
    console.error('Error creating livestream:', error);
    throw error;
  }
}

/**
 * Update a livestream
 */
export async function updateLivestream(
  id: number, 
  updates: Partial<LivestreamDataType>
): Promise<ApiResponse<LivestreamDataType>> {
  try {
    const { data, error } = await supabase
      .from('livestreams')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: toFrontendLivestream(data)
    };
  } catch (error) {
    console.error('Error updating livestream:', error);
    throw error;
  }
}

/**
 * Delete a livestream
 */
export async function deleteLivestream(id: number): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from('livestreams')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: null
    };
  } catch (error) {
    console.error('Error deleting livestream:', error);
    throw error;
  }
}

/**
 * Get livestreams by creator wallet address
 */
export async function getLivestreamsByCreator(
  walletAddress: string
): Promise<ApiResponse<LivestreamDataType[]>> {
  return getAllLivestreams({ creator_wallet_address: walletAddress });
}

/**
 * Increment view count for a livestream
 */
export async function incrementViewCount(id: number): Promise<ApiResponse<LivestreamDataType>> {
  try {
    // First get current view count
    const { data: current, error: fetchError } = await supabase
      .from('livestreams')
      .select('view_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    // Increment and update
    const { data, error } = await supabase
      .from('livestreams')
      .update({ view_count: (current?.view_count || 0) + 1 })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: toFrontendLivestream(data)
    };
  } catch (error) {
    console.error('Error incrementing view count:', error);
    throw error;
  }
}

/**
 * Start a livestream (update status to active/live)
 */
export async function startLivestream(id: number): Promise<ApiResponse<LivestreamDataType>> {
  return updateLivestream(id, { status: 'active' });
}

/**
 * End a livestream (update status to ended)
 */
export async function endLivestream(id: number): Promise<ApiResponse<LivestreamDataType>> {
  return updateLivestream(id, {
    status: 'ended',
    end_time: new Date().toISOString(),
  });
}

/**
 * Get active/live livestreams
 */
export async function getActiveLivestreams(): Promise<ApiResponse<LivestreamDataType[]>> {
  // Try both 'live' and 'active' statuses
  try {
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .in('status', ['live', 'active'])
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return {
        success: false,
        data: [],
        error: error.message,
        count: 0
      };
    }

    const livestreams = (data || []).map(toFrontendLivestream);
    
    return {
      success: true,
      data: livestreams,
      count: livestreams.length
    };
  } catch (error) {
    console.error('Error fetching active livestreams:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      count: 0
    };
  }
}

/**
 * Get ended livestreams (for showing past streams)
 */
export async function getEndedLivestreams(limit?: number): Promise<ApiResponse<LivestreamDataType[]>> {
  return getAllLivestreams({ status: 'ended', limit });
}

/**
 * Get scheduled livestreams
 */
export async function getScheduledLivestreams(): Promise<ApiResponse<LivestreamDataType[]>> {
  return getAllLivestreams({ status: 'scheduled' });
}

// Utility functions

/**
 * Format livestream time
 */
export function formatLivestreamTime(dateString?: string): string {
  if (!dateString) return 'Not set';
  
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get livestream status badge color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'live':
    case 'active':
      return 'bg-green-500';
    case 'scheduled':
      return 'bg-yellow-500';
    case 'ended':
      return 'bg-gray-500';
    default:
      return 'bg-gray-400';
  }
}

/**
 * Check if user can edit livestream (based on wallet address)
 */
export function canEditLivestream(
  livestream: LivestreamDataType, 
  userWalletAddress?: string
): boolean {
  return !!userWalletAddress && livestream.creator_wallet_address === userWalletAddress;
}

import { supabase } from '../supabase-client';
import { cacheManager } from '../utils/cacheManager';

export async function getDatabaseHash(agentId: string) {
  const { data, error } = await supabase
    .from('walrus_blobs')
    .select('blob_hash')
    .eq('agent_id', agentId)
    .single();

  if (error) throw error;
  if (!data) return { status: 'not_found' };

  // Cache the blob hash
  cacheManager.set(agentId, Buffer.from(data.blob_hash));

  return {
    status: 'success',
    blobHash: data.blob_hash
  };
}

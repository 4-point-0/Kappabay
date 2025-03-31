import { supabase } from '../supabase-client';

export async function getDatabaseHash(agentId: string) {
  const { data, error } = await supabase
    .from('walrus_blobs')
    .select('blob_hash')
    .eq('agent_id', agentId)
    .single();

  if (error) throw error;
  if (!data) return { status: 'not_found' };

  return { 
    status: 'success',
    blobHash: data.blob_hash
  };
}

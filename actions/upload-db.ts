import { supabase } from '../supabase-client';
import { cacheManager } from '../utils/cacheManager';

export async function uploadDatabase(agentId: string, dbFile: File) {
  // 1. Check for existing blob hash
  const { data: existing } = await supabase
    .from('walrus_blobs')
    .select('blob_hash')
    .eq('agent_id', agentId)
    .single();

  // 2. If exists, delete from Walrus first
  if (existing?.blob_hash) {
    await fetch(`https://api.walrus.testnet/del/${existing.blob_hash}`, {
      method: 'DELETE'
    });
  }

  // 3. Upload new blob to Walrus
  const formData = new FormData();
  formData.append('file', dbFile);
  
  const uploadRes = await fetch('https://api.walrus.testnet/put', {
    method: 'POST',
    body: formData
  });
  const { hash: newHash } = await uploadRes.json();

  // 4. Cache the new blob hash
  cacheManager.set(agentId, Buffer.from(newHash));

  // 5. Store new hash in Supabase
  const { error } = await supabase
    .from('walrus_blobs')
    .upsert({ 
      agent_id: agentId, 
      blob_hash: newHash 
    });

  if (error) throw error;

  return { 
    status: 'success', 
    blobHash: newHash 
  };
}

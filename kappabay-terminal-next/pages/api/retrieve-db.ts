import type { NextApiRequest, NextApiResponse } from 'next';
import { getBlobHash } from '../../lib/simpleDb';

const retrieveHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId } = req.query;

  if (!agentId || typeof agentId !== 'string') {
    return res.status(400).json({ error: 'agentId is required and must be a string' });
  }

  try {
    const blobHash = await getBlobHash(agentId);

    if (!blobHash) {
      return res.status(404).json({ error: 'Blob hash not found for the provided agentId' });
    }

    return res.status(200).json({ blobHash });
  } catch (retrieveError) {
    console.error('Retrieve error:', retrieveError);
    return res.status(500).json({ error: 'Failed to retrieve the blob hash' });
  }
};

export default retrieveHandler;

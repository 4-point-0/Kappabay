import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { getBlobHash, setBlobHash, deleteBlobHash } from '../../lib/simpleDb';
import { uploadBlob, deleteBlob } from '../../lib/walrusApi';

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parsing error:', err);
      return res.status(500).json({ error: 'Error parsing the form' });
    }

    const agentId = fields.agentId as string;
    const file = files.file as formidable.File;

    if (!agentId || !file) {
      return res.status(400).json({ error: 'agentId and db.sqlite file are required' });
    }

    try {
      // Check for existing blob hash
      const existingBlobHash = await getBlobHash(agentId);

      if (existingBlobHash) {
        // Delete the existing blob from Walrus
        await deleteBlob(existingBlobHash);
      }

      // Upload the new db.sqlite file to Walrus
      const newBlobHash = await uploadBlob(file.filepath, fields.sendObjectTo as string | undefined);

      // Save the new blob hash in simpleDb
      await setBlobHash(agentId, newBlobHash);

      return res.status(200).json({ state: 'success', blobHash: newBlobHash });
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload the db.sqlite file' });
    } finally {
      // Clean up the uploaded file
      fs.unlink(file.filepath, (unlinkErr) => {
        if (unlinkErr) console.error('File unlink error:', unlinkErr);
      });
    }
  });
};

export default uploadHandler;

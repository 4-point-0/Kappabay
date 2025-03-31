import { NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs';
import { getBlobHash, setBlobHash } from '../../../lib/simpleDb';
import { uploadBlob, deleteBlob } from '../../../lib/walrusApi';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function PUT(request: Request) {
  const form = new formidable.IncomingForm();

  return new Promise(async (resolve, reject) => {
    form.parse(request as any, async (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        resolve(
          NextResponse.json({ error: 'Error parsing the form' }, { status: 500 })
        );
        return;
      }

      const agentId = fields.agentId as string;
      const file = files.file as formidable.File;

      if (!agentId || !file) {
        resolve(
          NextResponse.json(
            { error: 'agentId and db.sqlite file are required' },
            { status: 400 }
          )
        );
        return;
      }

      try {
        // Check for existing blob hash
        const existingBlobHash = await getBlobHash(agentId);

        if (existingBlobHash) {
          // Delete the existing blob from Walrus
          await deleteBlob(existingBlobHash);
        }

        // Upload the new db.sqlite file to Walrus
        const newBlobHash = await uploadBlob(
          file.filepath,
          fields.sendObjectTo as string | undefined
        );

        // Save the new blob hash in simpleDb
        await setBlobHash(agentId, newBlobHash);

        resolve(
          NextResponse.json(
            { state: 'success', blobHash: newBlobHash },
            { status: 200 }
          )
        );
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        resolve(
          NextResponse.json(
            { error: 'Failed to upload the db.sqlite file' },
            { status: 500 }
          )
        );
      } finally {
        // Clean up the uploaded file
        fs.unlink(file.filepath, (unlinkErr) => {
          if (unlinkErr) console.error('File unlink error:', unlinkErr);
        });
      }
    });
  });
}

import { useState } from 'react';

const UploadDb = () => {
  const [agentId, setAgentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [blobHash, setBlobHash] = useState<string>('');

  const handleUpload = async () => {
    if (!agentId || !file) {
      setStatus('agentId and db.sqlite file are required.');
      return;
    }

    const formData = new FormData();
    formData.append('agentId', agentId);
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-db', {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setBlobHash(data.blobHash);
        setStatus('Upload successful!');
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('An unexpected error occurred.');
    }
  };

  return (
    <div>
      <h2>Upload db.sqlite to Walrus</h2>
      <input
        type="text"
        placeholder="Agent ID"
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
      />
      <input
        type="file"
        accept=".sqlite"
        onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
      />
      <button onClick={handleUpload}>Upload</button>
      <p>{status}</p>
      {blobHash && <p>Blob Hash: {blobHash}</p>}
    </div>
  );
};

export default UploadDb;

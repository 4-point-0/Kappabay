import { useState } from 'react';

const RetrieveDb = () => {
  const [agentId, setAgentId] = useState('');
  const [blobHash, setBlobHash] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const handleRetrieve = async () => {
    if (!agentId) {
      setStatus('agentId is required.');
      return;
    }

    try {
      const response = await fetch(`/api/retrieve-db?agentId=${agentId}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok) {
        setBlobHash(data.blobHash);
        setStatus('Retrieve successful!');
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Retrieve error:', error);
      setStatus('An unexpected error occurred.');
    }
  };

  return (
    <div>
      <h2>Retrieve db.sqlite Blob Hash from Walrus</h2>
      <input
        type="text"
        placeholder="Agent ID"
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
      />
      <button onClick={handleRetrieve}>Retrieve</button>
      <p>{status}</p>
      {blobHash && <p>Blob Hash: {blobHash}</p>}
    </div>
  );
};

export default RetrieveDb;

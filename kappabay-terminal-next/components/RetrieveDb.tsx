"use client";

import { useState } from 'react';
import { retrieveDb } from '../app/actions/retrieve-db';

const RetrieveDb = () => {
  const [agentId, setAgentId] = useState('');
  const [blobHash, setBlobHash] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const handleRetrieve = async () => {
    if (!agentId) {
      setStatus('Agent ID is required.');
      return;
    }

    try {
      const result = await retrieveDb(agentId);
      setBlobHash(result.blobHash);
        setStatus('Retrieve successful!');
      } else {
        setStatus(`Error: ${error.message}`);
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

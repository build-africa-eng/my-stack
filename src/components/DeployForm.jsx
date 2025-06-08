// src/components/DeployForm.jsx
import React, { useState } from 'react';

export default function DeployForm({ setOutput }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleDeploy(e) {
    e.preventDefault();
    setLoading(true);
    setOutput(null);

    try {
      const res = await fetch(`https://your-worker-url.workers.dev/?repo=${encodeURIComponent(repoUrl)}`);
      const data = await res.json();
      setOutput(data);
    } catch (err) {
      setOutput({ error: 'Failed to deploy: ' + err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleDeploy} className="max-w-xl mx-auto space-y-4">
      <input
        type="url"
        placeholder="GitHub Repo URL (e.g. https://github.com/user/app)"
        value={repoUrl}
        onChange={e => setRepoUrl(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 text-white"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-semibold w-full"
      >
        {loading ? 'Deploying...' : 'Deploy to WorkerStack'}
      </button>
    </form>
  );
}

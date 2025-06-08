import React, { useState, useEffect } from 'react';

export default function DeployForm({ setOutput }) {
  const [mode, setMode] = useState('analyze');
  const [url, setUrl] = useState('');
  const [userId, setUserId] = useState('');
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [deployType, setDeployType] = useState('worker');
  const [cloudflareToken, setCloudflareToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    if (userId) {
      setUserId(userId);
      fetchRepos(userId);
    }
  }, []);

  const fetchRepos = async (userId) => {
    try {
      const response = await fetch(`https://my-worker.afrcanfuture.workers.dev/repos?userId=${encodeURIComponent(userId)}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setRepos(data);
    } catch (error) {
      setOutput({ error: `Failed to fetch repos: ${error.message}` });
    }
  };

  const handleGitHubLogin = () => {
    window.location.href = 'https://my-worker.afrcanfuture.workers.dev/auth';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setOutput(null); // Clear previous output
    try {
      let response;
      if (mode === 'analyze') {
        response = await fetch(`https://my-worker.afrcanfuture.workers.dev/diagnostics?url=${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        response = await fetch('https://my-worker.afrcanfuture.workers.dev/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            repoUrl: selectedRepo,
            type: deployType,
            cloudflareToken,
            accountId,
            projectName,
          }),
        });
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }
      const data = await response.json();
      setOutput(data);
      if (mode === 'deploy') {
        setCloudflareToken('');
        setAccountId('');
        setProjectName('');
      }
    } catch (error) {
      setOutput({ error: error.message });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="w-full p-2 mb-4 bg-gray-800 text-white rounded"
      >
        <option value="analyze">Analyze URL</option>
        <option value="deploy">Deploy Site/Worker</option>
      </select>
      {mode === 'analyze' ? (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL (e.g., https://example.com)"
          className="w-full p-2 mb-4 bg-gray-800 text-white rounded"
          required
        />
      ) : (
        <>
          {!userId ? (
            <button
              type="button"
              onClick={handleGitHubLogin}
              className="w-full p-2 mb-4 bg-blue-600 rounded"
            >
              Login with GitHub
            </button>
          ) : (
            <>
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full p-2 mb-4 bg-gray-800 text-white rounded"
                required
              >
                <option value="">Select a repository</option>
                {repos.map((repo) => (
                  <option key={repo.id} value={repo.html_url}>
                    {repo.full_name}
                  </option>
                ))}
              </select>
              <select
                value={deployType}
                onChange={(e) => setDeployType(e.target.value)}
                className="w-full p-2 mb-4 bg-gray-800 text-white rounded"
              >
                <option value="worker">Deploy as Worker</option>
                <option value="static">Deploy as Static Site</option>
              </select>
              <input
                type="password"
                value={cloudflareToken}
                onChange={(e) => setCloudflareToken(e.target.value)}
                placeholder="Cloudflare API Token"
                className="w-full p-2 mb-4 bg-gray-800 text-white rounded"
                required
              />
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Cloudflare Account ID"
                className="w-full p-2 mb-4 bg-gray-800 text-white rounded"
                required
              />
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project Name (e.g., my-worker or my-site)"
                className="w-full p-2 mb-4 bg-gray-800 text-white rounded"
                required
              />
            </>
          )}
        </>
      )}
      <button type="submit" className="w-full p-2 bg-blue-600 rounded" disabled={mode === 'deploy' && !userId}>
        {mode === 'analyze' ? 'Analyze' : 'Deploy'}
      </button>
    </form>
  );
}
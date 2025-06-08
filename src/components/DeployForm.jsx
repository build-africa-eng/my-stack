// src/components/DeployForm.jsx
import React, { useState } from 'react';

export default function DeployForm({ setOutput }) {
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setOutput(null);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(
        `https://my-worker.afrcanfuture.workers.dev/?url=${encodeURIComponent(inputUrl)}`
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Something went wrong');
      }

      const data = await response.json();
      setOutput(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto bg-gray-900 p-4 rounded-xl shadow-lg"
    >
      <label htmlFor="url" className="block text-sm font-medium mb-2">
        Enter a URL to analyze:
      </label>
      <input
        id="url"
        type="url"
        required
        placeholder="https://example.com"
        value={inputUrl}
        onChange={(e) => setInputUrl(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mb-4"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
      >
        {loading ? 'Analyzing...' : 'Analyze URL'}
      </button>

      {error && (
        <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
      )}
    </form>
  );
}
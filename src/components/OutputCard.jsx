import React from 'react';

export default function OutputCard({ output }) {
  if (output.error) {
    return <div className="p-4 bg-red-600 rounded">Error: {output.error}</div>;
  }

  if (output.message && output.message.includes('Deployment')) {
    return (
      <div className="p-4 bg-gray-800 rounded mt-4">
        <h2 className="text-xl font-bold">Deployment Results</h2>
        <p><strong>Message:</strong> {output.message}</p>
        <p><strong>Deployment ID:</strong> {output.deploymentId}</p>
        {output.data && <p><strong>Details:</strong> {JSON.stringify(output.data)}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded mt-4">
      <h2 className="text-xl font-bold">Analysis Results</h2>
      <p><strong>URL:</strong> {output.url}</p>
      <p><strong>Title:</strong> {output.title}</p>
      <p><strong>Description:</strong> {output.description || 'N/A'}</p>
      <p><strong>H1:</strong> {output.h1 || 'N/A'}</p>
    </div>
  );
}
// src/components/OutputCard.jsx
import React from 'react';

export default function OutputCard({ output }) {
  return (
    <div className="bg-gray-800 mt-6 p-4 rounded max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-2">Deployment Output</h2>
      <pre className="whitespace-pre-wrap break-words text-sm">
        {JSON.stringify(output, null, 2)}
      </pre>
    </div>
  );
}
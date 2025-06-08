// src/pages/Home.jsx
import React, { useState } from 'react';
import DeployForm from '../components/DeployForm';
import OutputCard from '../components/OutputCard';

export default function Home() {
  const [output, setOutput] = useState(null);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">⚡ WorkerStack Deployer</h1>
      <DeployForm setOutput={setOutput} />
      {output && <OutputCard output={output} />}
    </div>
  );
}
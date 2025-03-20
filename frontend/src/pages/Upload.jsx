// src/pages/Upload.jsx
import React, { useState } from 'react';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) {
      setMessage('No file selected.');
      return;
    }
    // Simulate a file upload
    setTimeout(() => {
      setMessage(`File "${file.name}" uploaded successfully!`);
      setFile(null);
    }, 800);
  };

  return (
    <div className="bg-white min-h-screen text-gray-900 p-6">
      <h1 className="text-3xl font-bold mb-4">Upload Documents</h1>
      <p className="text-gray-700 text-sm mb-4">
        Select and upload PDF or DOCX files for summarization or analysis.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mb-4">
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          className="text-sm text-gray-700"
        />
        <button
          onClick={handleUpload}
          className="bg-[#4B8795] text-white text-sm px-4 py-2 rounded hover:bg-[#407986] transition"
        >
          Upload
        </button>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-200 p-3 rounded text-green-800 text-sm max-w-sm">
          {message}
        </div>
      )}
    </div>
  );
}

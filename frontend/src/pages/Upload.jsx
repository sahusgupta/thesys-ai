// src/pages/Upload.jsx
import React, { useState } from 'react';

export default function Upload() {
  // Example state for the selected file & recent uploads
  const [file, setFile] = useState(null);
  const [recentUploads, setRecentUploads] = useState([
    {
      id: 1,
      name: 'Deep_Learning_Paper.pdf',
      date: '2025-03-01',
      size: '2.1 MB',
    },
    {
      id: 2,
      name: 'ML_Healthcare.docx',
      date: '2025-03-02',
      size: '1.4 MB',
    },
  ]);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleUpload = () => {
    if (!file) {
      setMessage('No file selected.');
      return;
    }
    // Simulate a file upload
    setTimeout(() => {
      const newId = recentUploads.length + 1;
      const date = new Date().toISOString().split('T')[0];
      const newUpload = {
        id: newId,
        name: file.name,
        date,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      };
      setRecentUploads([newUpload, ...recentUploads]);
      setMessage(`File "${file.name}" uploaded successfully!`);
      setFile(null);
    }, 800);
  };

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900">
      {/* Gradient Banner / Page Header */}
      <div
        className="p-4 md:p-6 text-gray-800 shadow-sm relative overflow-hidden flex justify-center items-center h-60"
        style={{
          background: 'linear-gradient(120deg, #f0f9ff 0%, #e0f4f8 35%, #ffffff 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute w-48 h-48 bg-[#4B8795] rounded-full opacity-10 top-0 right-0 transform translate-x-1/3 -translate-y-1/2" />
        <div className="absolute w-32 h-32 bg-[#4B8795] rounded-full opacity-5 bottom-0 left-4" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-center">Upload Documents</h1>
            <p className="text-sm text-gray-700 max-w-lg ">
              Upload PDFs, DOCX files, or TXT for analysis. Your recent uploads are also shown.
            </p>
          </div>
          {/* Optional Banner Button or Graphic could go here */}
        </div>
      </div>

      {/* Upload Form & Recent Files */}
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Upload Section */}
        <div className="bg-white border rounded-md p-4 mb-6 shadow-sm hover:shadow transition">
          <h2 className="text-sm font-bold text-[#4B8795] mb-2">Upload a File</h2>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="text-sm text-gray-700 border border-gray-300 rounded px-2 py-1"
            />
            <button
              onClick={handleUpload}
              className="bg-[#4B8795] text-white text-sm px-4 py-2 rounded hover:bg-[#407986] transition"
            >
              Upload
            </button>
          </div>
          {message && (
            <div className="mt-3 bg-green-50 text-green-800 border border-green-100 p-2 rounded text-sm">
              {message}
            </div>
          )}
        </div>

        {/* Recent Uploads Section */}
        <div className="bg-white border rounded-md p-4 shadow-sm">
          <h2 className="text-sm font-bold text-[#4B8795] mb-3">Recent Uploads</h2>
          {recentUploads.length === 0 ? (
            <p className="text-xs text-gray-500">No files have been uploaded yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {recentUploads.map((fileItem) => (
                <RecentFileCard key={fileItem.id} fileItem={fileItem} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Sub-component for a single recently uploaded file preview */
function RecentFileCard({ fileItem }) {
  return (
    <div className="border border-gray-200 rounded p-3 hover:shadow-sm transition flex flex-col justify-between">
      <h3 className="text-sm font-semibold text-gray-800 truncate">{fileItem.name}</h3>
      <p className="text-xs text-gray-600 mt-1">
        {fileItem.size} | Uploaded on {fileItem.date}
      </p>
      {/* Additional actions like 'View' or 'Delete' could go here */}
      <div className="mt-2">
        <button className="text-xs text-[#4B8795] underline hover:no-underline mr-2">
          View
        </button>
        <button className="text-xs text-red-500 underline hover:no-underline">
          Delete
        </button>
      </div>
    </div>
  );
}

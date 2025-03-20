// src/pages/Dashboard.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="bg-white min-h-screen text-gray-900 p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-700 text-sm mb-4">
        Welcome to your Thesys AI Dashboard. Quickly access key tools below.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/upload"
          className="bg-[#4B8795] text-white rounded p-4 hover:bg-[#407986] transition no-underline"
        >
          <h2 className="font-semibold text-sm">Upload</h2>
          <p className="text-xs mt-1">Upload new docs for analysis.</p>
        </Link>

        <Link
          to="/search"
          className="bg-[#4B8795] text-white rounded p-4 hover:bg-[#407986] transition no-underline"
        >
          <h2 className="font-semibold text-sm">AI Search</h2>
          <p className="text-xs mt-1">Search across your documents.</p>
        </Link>

        <Link
          to="/citations"
          className="bg-[#4B8795] text-white rounded p-4 hover:bg-[#407986] transition no-underline"
        >
          <h2 className="font-semibold text-sm">Citations</h2>
          <p className="text-xs mt-1">View and format citations.</p>
        </Link>

        <Link
          to="/library"
          className="bg-[#4B8795] text-white rounded p-4 hover:bg-[#407986] transition no-underline"
        >
          <h2 className="font-semibold text-sm">Library</h2>
          <p className="text-xs mt-1">Explore stored research papers.</p>
        </Link>

        <Link
          to="/settings"
          className="bg-[#4B8795] text-white rounded p-4 hover:bg-[#407986] transition no-underline"
        >
          <h2 className="font-semibold text-sm">Settings</h2>
          <p className="text-xs mt-1">Customize your experience.</p>
        </Link>

        {/* Add more quick links as needed */}
      </div>
    </div>
  );
}

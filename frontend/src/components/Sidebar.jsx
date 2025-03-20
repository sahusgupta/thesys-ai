// src/components/Sidebar.js
import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <aside className="w-64 bg-gray-50 text-black h-screen fixed top-0 left-0 pt-24 shadow">
      <nav className="flex flex-col p-4 space-y-2">
        <Link to="/dashboard" className="p-2 rounded hover:bg-gray-200 transition no-underline">Dashboard</Link>
        <Link to="/upload" className="p-2 rounded hover:bg-gray-200 transition no-underline">Upload Documents</Link>
        <Link to="/search" className="p-2 rounded hover:bg-gray-200 transition no-underline">AI Search</Link>
        <Link to="/chat" className="p-2 rounded hover:bg-gray-200 transition no-underline">Chat Assistant</Link>
        <Link to="/citations" className="p-2 rounded hover:bg-gray-200 transition no-underline">Citations</Link>
        <Link to="/library" className="p-2 rounded hover:bg-gray-200 transition no-underline">Library</Link>
        <Link to="/settings" className="p-2 rounded hover:bg-gray-200 transition no-underline">Settings</Link>
      </nav>
    </aside>
  );
};

export default Sidebar;

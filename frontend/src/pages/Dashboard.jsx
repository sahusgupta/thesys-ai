// src/pages/Dashboard.jsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon,
  SearchIcon,
  ChatAltIcon,        // <-- Chat bubble icon from Heroicons v1
  CollectionIcon,
  CogIcon,
  UserIcon,
  ViewGridIcon
} from '@heroicons/react/outline';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">

      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
        {/* Brand / Logo Section */}
        <div
          className="h-16 flex items-center justify-center border-b border-gray-200 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #e3f2f9 0%, #f0f9ff 100%)',
          }}
        >
          <div className="z-10">
            <h1 className="text-xl font-bold text-[#4B8795] tracking-wide no-underline">
              Thesys AI
            </h1>
          </div>
          {/* Decorative circle */}
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-[#4B8795] rounded-full opacity-10 transform translate-x-1/3 translate-y-1/3" />
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-1">
          <NavItem route="/" label="Home" Icon={HomeIcon} currentPath={location.pathname} />
          <NavItem route="/dashboard" label="Dashboard" Icon={ViewGridIcon} currentPath={location.pathname} />
          <NavItem route="/search" label="Search" Icon={SearchIcon} currentPath={location.pathname} />
          <NavItem route="/chat" label="Chat" Icon={ChatAltIcon} currentPath={location.pathname} />
          <NavItem route="/library" label="Library" Icon={CollectionIcon} currentPath={location.pathname} />
          <NavItem route="/settings" label="Settings" Icon={CogIcon} currentPath={location.pathname} />
          <NavItem route="/profile" label="Profile" Icon={UserIcon} currentPath={location.pathname} />
        </nav>
      </aside>

      {/* Mobile Nav Toggle */}
      <div className="md:hidden border-b border-gray-200 p-3">
        <button className="text-gray-500">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 relative">
        {/* Gradient Banner / Welcome Card */}
        <div
          className="rounded-md p-4 mb-6 text-gray-800 shadow-sm relative overflow-hidden"
          style={{
            background: 'linear-gradient(120deg, #f0f9ff 0%, #e0f4f8 35%, #ffffff 100%)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute w-48 h-48 bg-[#4B8795] rounded-full opacity-10 top-0 right-0 transform translate-x-1/3 -translate-y-1/2" />
          <div className="absolute w-32 h-32 bg-[#4B8795] rounded-full opacity-5 bottom-0 left-4" />

          <div className="relative flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">
                Welcome to Thesys AI
              </h2>
              <p className="text-sm mt-1 text-gray-700 max-w-lg">
                Accelerate your research with instant summaries, fact-checking, and citation management.
                Here's how you can get started:
              </p>
              <ol className="list-decimal list-inside text-xs mt-2 text-gray-600 space-y-1">
                <li>Upload a document (see sidebar).</li>
                <li>Try out our Chat for quick, interactive help.</li>
                <li>Manage references in Library & beyond.</li>
              </ol>
            </div>
            <button className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1">
              ✕
            </button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <StatsCard title="Documents" count="14" desc="Uploaded" />
          <StatsCard title="Conversations" count="5" desc="In Chat" />
          <StatsCard title="Library" count="9" desc="Papers" />
        </div>

        {/* Recent Activity or Additional Info */}
        <div className="bg-white border rounded-md p-4 hover:shadow transition">
          <h3 className="text-sm text-gray-800 font-bold mb-2">Recent Activity</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>- Chat session: "AI in Healthcare Summaries" (10 mins ago)</li>
            <li>- "Is GPT-4 100% accurate?" (Explored in chat, 25 mins ago)</li>
            <li>- "Deep Learning Paper" successfully uploaded.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

/* 
  Sub-components: NavItem and StatsCard 
*/

function NavItem({ route, label, Icon, currentPath }) {
  return (
    <Link
      to={route}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
        currentPath === route
          ? 'bg-gray-100 text-[#4B8795]'
          : 'text-gray-600 hover:bg-gray-50 hover:text-[#4B8795]'
      }`}
    >
      <Icon className="mr-3 h-5 w-5" />
      {label}
    </Link>
  );
}

function StatsCard({ title, count, desc }) {
  return (
    <div className="bg-white border rounded-md p-4 hover:shadow transition">
      <h3 className="text-sm text-[#4B8795] font-semibold">{title}</h3>
      <p className="text-xs text-gray-700 mt-1">
        <span className="font-bold">{count}</span> {desc}
      </p>
    </div>
  );
}

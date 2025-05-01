// src/components/Sidebar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
// Import icons from react-icons
import { FaTachometerAlt, FaComments, FaSearch, FaCog, FaUser, FaBook, FaAngleLeft, FaAngleRight, FaBars } from 'react-icons/fa';
import RecentActivities from './RecentActivities';
import { FiMenu, FiHome, FiMessageSquare, FiBook, FiSearch, FiSettings, FiUser } from 'react-icons/fi';

function Sidebar({ isCollapsed, toggleSidebar }) {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: <FiHome size={20} />, label: 'Dashboard' },
    { path: '/chat', icon: <FiMessageSquare size={20} />, label: 'Chat' },
    { path: '/library', icon: <FiBook size={20} />, label: 'Library' },
    { path: '/search', icon: <FiSearch size={20} />, label: 'Search' },
    { path: '/settings', icon: <FiSettings size={20} />, label: 'Settings' },
    { path: '/profile', icon: <FiUser size={20} />, label: 'Profile' },
  ];

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-card border-r border-border transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!isCollapsed && (
          <Link to="/" className="text-xl font-semibold text-foreground">
            Thesys
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="btn-secondary p-2 rounded-md ml-auto"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <FiMenu size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-md transition-colors
                ${isActive 
                  ? 'btn-primary' 
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }
              `}
            >
              <div className="flex items-center gap-2">
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Recent Activity Section */}
      {!isCollapsed && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground px-4 mb-3">Recent Activity</h3>
          <RecentActivities />
        </div>
      )}

      {/* Optional Footer/User Area */}
      {/* <div className="p-4 border-t border-gray-200">
        {!isCollapsed && <p>User Info / Logout</p>}
      </div> */}
    </aside>
  );
}

export default Sidebar;

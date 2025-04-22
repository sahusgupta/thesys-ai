// src/components/Sidebar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
// Import icons from react-icons
import { FaTachometerAlt, FaComments, FaSearch, FaCog, FaUser, FaBook, FaAngleLeft, FaAngleRight, FaBars } from 'react-icons/fa';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: <FaTachometerAlt /> },
  { path: '/chat', label: 'Chat', icon: <FaComments /> },
  { path: '/library', label: 'Library', icon: <FaBook /> },
  { path: '/search', label: 'Search', icon: <FaSearch /> }, // Assuming /search uses FaSearch
  { path: '/settings', label: 'Settings', icon: <FaCog /> },
  { path: '/profile', label: 'Profile', icon: <FaUser /> },
];

function Sidebar({ isCollapsed, toggleSidebar }) {
  const location = useLocation();

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white text-gray-700 border-r border-gray-200 z-30 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div className="flex flex-col h-full">
        {/* Toggle Button & Title */}
        <div className="flex items-center justify-center p-4 h-16 border-b border-gray-200">
          <button
            onClick={toggleSidebar}
            className="text-gray-500 hover:text-gray-800 focus:outline-none"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <FaAngleRight size={20} /> : <FaAngleLeft size={20} />}
          </button>
          {!isCollapsed && <span className="ml-4 text-xl font-semibold text-gray-800">Thesys</span>}
        </div>

        {/* Navigation Links */}
        <nav className="flex-grow mt-4">
          <ul>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path} className="mb-1">
                  <Link
                    to={item.path}
                    title={isCollapsed ? item.label : ''} // Show tooltip when collapsed
                    className={`flex items-center px-4 py-2.5 rounded-md mx-2 transition-colors duration-200 
                                ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                  >
                    <span className={`w-6 h-6 flex items-center justify-center ${isCollapsed ? 'mx-auto' : ''}`}>
                      {item.icon || <FaBars />} {/* Render icon */}
                    </span>
                    {!isCollapsed && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Optional Footer/User Area */}
        {/* <div className="p-4 border-t border-gray-200">
          {!isCollapsed && <p>User Info / Logout</p>}
        </div> */}
      </div>
    </aside>
  );
}

export default Sidebar;

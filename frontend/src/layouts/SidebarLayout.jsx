import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useTheme } from '../context/ThemeContext';

function SidebarLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme } = useTheme();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <main 
        className={`flex-1 transition-all duration-300 ease-in-out overflow-y-auto
          ${isCollapsed ? 'ml-20' : 'ml-64'}
        `}
      >
        <div className="min-h-screen p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default SidebarLayout; 
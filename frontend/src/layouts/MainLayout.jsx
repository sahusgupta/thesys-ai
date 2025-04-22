import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <main
        className={`flex-1 overflow-x-hidden overflow-y-auto transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        {/* Optional Header could go here */}
        <div className="p-4 md:p-6"> {/* Add padding to content area */}
          <Outlet /> {/* Child routes will render here */}
        </div>
      </main>
    </div>
  );
}

export default MainLayout; 
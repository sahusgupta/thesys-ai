// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiMessageSquare, FiUsers, FiStar, FiFile, FiSearch, FiUpload, FiBarChart2, FiBook, FiTrendingUp } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    stats: { num_chats: 0, total_messages: 0, pinned_messages: 0, total_files: 0 },
    recent_files: [],
    usage_stats: { daily_usage: 0, weekly_usage: 0, monthly_usage: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setLoading(false);
        setError("Please log in to view the dashboard.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        let headers = {};
        if (currentUser) {
          const token = await currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await axios.get('/api/dashboard', { headers });
        setDashboardData(response.data);
      } catch (err) {
        console.error("Error during fetchData:", err);
        setError('Failed to load dashboard data. Please check console for details.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser !== undefined) {
      fetchData();
    }
  }, [currentUser]);

  if (loading) {
    if (currentUser === undefined) {
      return <div className="p-6 text-center">Authenticating...</div>;
    }
    return <div className="p-6 text-center">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }

  const stats = dashboardData?.stats || { num_chats: 0, total_messages: 0, pinned_messages: 0, total_files: 0 };
  const recent_files = dashboardData?.recent_files || [];
  const usage_stats = dashboardData?.usage_stats || { daily_usage: 0, weekly_usage: 0, monthly_usage: 0 };

  const statsGrid = [
    { title: 'Total Chats', value: stats.num_chats, icon: <FiMessageSquare size={24} />, change: '+12%' },
    { title: 'Documents Analyzed', value: stats.total_files, icon: <FiBook size={24} />, change: '+8%' },
    { title: 'Searches', value: stats.total_messages, icon: <FiSearch size={24} />, change: '+23%' },
  ];

  const recentActivity = [
    { type: 'chat', title: 'Research on Neural Networks', time: '2 hours ago' },
    { type: 'document', title: 'Machine Learning Basics.pdf', time: '4 hours ago' },
    { type: 'search', title: 'Deep Learning Applications', time: '6 hours ago' },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <button className="btn-primary px-4 py-2 rounded-md">
          New Chat
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsGrid.map((stat, index) => (
          <div key={index} className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="text-primary/80">{stat.icon}</div>
              <span className="text-sm text-green-500 flex items-center">
                <FiTrendingUp className="mr-1" />
                {stat.change}
              </span>
            </div>
            <h3 className="text-2xl font-semibold mt-2">{stat.value}</h3>
            <p className="text-muted-foreground text-sm">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 rounded-md hover:bg-accent/10 transition-colors">
              {activity.type === 'chat' && <FiMessageSquare className="text-primary" size={20} />}
              {activity.type === 'document' && <FiBook className="text-primary" size={20} />}
              {activity.type === 'search' && <FiSearch className="text-primary" size={20} />}
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full btn-secondary text-left px-4 py-3 rounded-md flex items-center space-x-2">
              <FiMessageSquare />
              <span>Start a new chat</span>
            </button>
            <button className="w-full btn-secondary text-left px-4 py-3 rounded-md flex items-center space-x-2">
              <FiBook />
              <span>Upload a document</span>
            </button>
            <button className="w-full btn-secondary text-left px-4 py-3 rounded-md flex items-center space-x-2">
              <FiSearch />
              <span>Search knowledge base</span>
            </button>
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">API Status</span>
              <span className="text-green-500">Operational</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Response Time</span>
              <span className="text-foreground">234ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Model Version</span>
              <span className="text-foreground">v2.1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quick Action component
const QuickAction = ({ icon, title, description, link }) => (
  <a 
    href={link}
    className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col items-center text-center no-underline"
  >
    <div className="p-3 rounded-full bg-[#407986]/10 text-[#407986] mb-3">
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <h3 className="font-medium text-gray-800">{title}</h3>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
  </a>
);

// Stat Card component
const StatCard = ({ icon, title, value }) => (
  <div className="bg-white p-4 rounded-lg shadow flex items-center">
    <div className="p-3 rounded-full bg-[#407986]/10 text-[#407986] mr-4">
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold text-gray-800">{value}</p>
    </div>
  </div>
);

export default Dashboard;

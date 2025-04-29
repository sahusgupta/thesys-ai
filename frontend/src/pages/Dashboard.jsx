// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiActivity, FiMessageSquare, FiUsers, FiStar } from 'react-icons/fi'; // Example icons
import { useAuth } from '../context/AuthContext'; // Import useAuth

const Dashboard = () => {
  console.log("Dashboard: Component rendering/rendered."); // Log component render

  const [dashboardData, setDashboardData] = useState({
    recent_activities: [],
    stats: { num_chats: 0, total_messages: 0, pinned_messages: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth(); // Get currentUser for potential auth header

  console.log("Dashboard: currentUser state:", currentUser); // Log currentUser state

  useEffect(() => {
    // Log when the effect itself runs and the value of currentUser at that time
    console.log("Dashboard: useEffect triggered. currentUser:", currentUser);

    const fetchData = async () => {
      console.log("Dashboard: fetchData function called."); // Log start of fetchData
      if (!currentUser) {
        console.log("Dashboard: No currentUser, skipping fetch.");
        setLoading(false); // Stop loading indicator
        setError("Please log in to view the dashboard."); // Optional: set an error message
        return; // Exit fetchData early
      }

      setLoading(true);
      setError(null);
      try {
        let headers = {};
        // --- Authentication Header ---

        if (currentUser) {
          console.log("Dashboard: Attempting to get ID token...");
          const token = await currentUser.getIdToken();
          console.log("Dashboard: Token retrieved:", token ? "Yes" : "No");
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          console.log("Dashboard: No currentUser, sending request without Authorization header.");
        }
        // --- End Authentication Header ---

        console.log("Dashboard: Preparing to make API call to /api/dashboard with headers:", headers); // Log before axios call
        const response = await axios.get('/api/dashboard', { headers }); // Send headers

        console.log("Dashboard: API call successful. Response Data:", response.data);
        setDashboardData(response.data);
      } catch (err) {
        console.error("Dashboard: Error during fetchData:", err); // Log the full error
        if (err.response) {
            console.error("Dashboard: Error response data:", err.response.data);
            console.error("Dashboard: Error response status:", err.response.status);
        } else if (err.request) {
            console.error("Dashboard: Error request (no response received):", err.request);
        } else {
            console.error('Dashboard: Error message (request setup issue?):', err.message);
        }
        setError('Failed to load dashboard data. Please check console for details.');
      } finally {
        console.log("Dashboard: fetchData finished.");
        setLoading(false);
      }
    };

    // Only call fetchData if currentUser is defined, or adjust based on whether
    // your endpoint *requires* auth vs. allows anonymous access
    // If the endpoint *requires* auth, waiting for currentUser is correct.
    if (currentUser !== undefined) { // Check if auth state is determined (not undefined)
        console.log("Dashboard: Calling fetchData...");
        fetchData();
    } else {
        console.log("Dashboard: Waiting for currentUser state to be determined...");
        // Optionally set loading to false or show a specific "authenticating" message
        // setLoading(false);
    }

  }, [currentUser]); // Dependency array remains [currentUser]

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString();
  };

  const getActivityDescription = (activity) => {
      switch(activity.type) {
          case 'sent_message':
              return `Sent a message (${activity.details?.message_length || 0} chars)`;
          case 'received_response':
              return `Received a response (${activity.details?.response_length || 0} chars)`;
          case 'chat_error':
              return `Encountered an error during chat`;
          case 'pinned_message':
              return `Pinned a message`; // Add details if logged
          case 'downloaded_paper':
              return `Downloaded paper: ${activity.details?.title || 'Unknown'}`; // Add details if logged
          default:
              return activity.type.replace(/_/g, ' '); // Default formatting
      }
  }

  console.log("Dashboard: Rendering state - loading:", loading, "error:", error, "data:", dashboardData);

  if (loading) {
    // Added check for initial undefined currentUser state
    if (currentUser === undefined) {
        return <div className="p-6 text-center">Authenticating...</div>;
    }
    return <div className="p-6 text-center">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }

  // Ensure dashboardData and its properties exist before destructuring
  const recent_activities = dashboardData?.recent_activities || [];
  const stats = dashboardData?.stats || { num_chats: 0, total_messages: 0, pinned_messages: 0 };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Dashboard</h1>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<FiMessageSquare />} title="Total Messages" value={stats.total_messages} />
        <StatCard icon={<FiUsers />} title="Chats Started" value={stats.num_chats} />
        <StatCard icon={<FiStar />} title="Pinned Messages" value={stats.pinned_messages} />
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
          <FiActivity className="mr-2" /> Recent Activity
        </h2>
        {recent_activities.length > 0 ? (
          <ul className="space-y-3">
            {recent_activities.map((activity, index) => (
              <li key={index} className="text-sm text-gray-600 border-b pb-2 last:border-b-0">
                <span className="font-medium text-gray-800">{getActivityDescription(activity)}</span>
                <span className="text-xs text-gray-500 block">{formatTimestamp(activity.timestamp)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No recent activity found.</p>
        )}
      </div>
    </div>
  );
};

// Simple Stat Card component
const StatCard = ({ icon, title, value }) => (
  <div className="bg-white p-4 rounded-lg shadow flex items-center">
    <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold text-gray-800">{value}</p>
    </div>
  </div>
);

export default Dashboard;

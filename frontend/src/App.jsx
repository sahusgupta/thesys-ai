// App.jsx
import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import SidebarLayout from './layouts/SidebarLayout';

// Public Page Imports
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';

// Authenticated Page Imports
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Library from './pages/Library';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
// import PaperSearch from './pages/PaperSearch'; // Uncomment if needed

// Other Imports
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* --- Public Routes --- */}
        {/* These routes do NOT have the sidebar */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* --- Authenticated Routes --- */}
        {/* This parent route applies PrivateRoute and SidebarLayout */}
        <Route
          element={
            <PrivateRoute>
              <SidebarLayout />
            </PrivateRoute>
          }
        >
          {/* Default route for authenticated users */}
          {/* Redirects from "/" (if logged in) to "/chat" */}
          <Route path="/" element={<Navigate to="/chat" replace />} />

          {/* Child routes rendered within SidebarLayout's <Outlet /> */}
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:chatId" element={<Chat />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="library" element={<Library />} />
          <Route path="search" element={<Search />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          {/* <Route path="paper-search" element={<PaperSearch />} /> */}
        </Route>

        {/* --- Catch-all 404 Route --- */}
        {/* Place this last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;

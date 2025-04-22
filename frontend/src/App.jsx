// App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './layouts/MainLayout';

// Public Page Imports
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';

// Authenticated Page Imports (rendered within MainLayout)
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Library from './pages/Library';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import PaperSearch from './pages/PaperSearch';

// Other Imports
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Authenticated Routes using MainLayout */}
        <Route 
          path="/" 
          element={
            <PrivateRoute> 
              <MainLayout />
            </PrivateRoute>
          }
        >
          {/* These routes render inside MainLayout's <Outlet /> */}
          <Route path="dashboard" element={<Dashboard />} /> 
          <Route path="chat" element={<Chat />} />
          <Route path="library" element={<Library />} />
          <Route path="search" element={<Search />} /> 
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          {/* Add PaperSearch if it needs the layout/sidebar */}
          {/* <Route path="paper-search" element={<PaperSearch />} /> */}
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;

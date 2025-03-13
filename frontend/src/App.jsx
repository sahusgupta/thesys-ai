// App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Upload from './pages/Upload';
import Chat from './pages/Chat';
import Citations from './pages/Citations';
import Library from './pages/Library';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/search" element={<Search />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/citations" element={<Citations />} />
            <Route path="/library" element={<Library />} />
            <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

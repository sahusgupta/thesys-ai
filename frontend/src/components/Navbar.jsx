// Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => (
  <nav className="fixed w-full bg-white shadow-md z-50 px-8 py-4 flex justify-between items-center">
    <Link to="/" className="font-bold text-2xl transition duration-200 hover:text-gray-600">Thesys AI</Link>
    <div className="space-x-6">
      {['Dashboard', 'Upload', 'Search', 'Chat', 'Citations', 'Library', 'Settings'].map((item) => (
        <Link key={item} to={`/${item.toLowerCase()}`} className="hover:text-gray-600 transition">
          {item}
        </Link>))}
      </div>
    </nav>
);

export default Navbar;
// Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const Navbar = () => (
  <nav className="fixed w-full bg-white shadow-md z-50 px-8 py-4 flex justify-between items-center">
    <Link to="/" className="font-bold text-2xl transition duration-200 hover:text-gray-600 no-underline flex items-center gap-4">
      <img src={logo} alt="Thesys AI Logo" className="h-10 invert" />
    </Link>
    <div className="flex">
      {['Dashboard', 'Upload', 'Search', 'Chat', 'Citations', 'Library', 'Settings'].map((item) => (
        <Link 
          key={item} 
          to={`/${item.toLowerCase()}`} 
          className="relative px-6 py-2 transition duration-300 text-gray-900 hover:bg-[#4B8795] hover:text-white no-underline"
          style={{ margin: '0', borderRadius: '0' }}
        >
          {item}
        </Link>
      ))}
    </div>
  </nav>
);


export default Navbar;
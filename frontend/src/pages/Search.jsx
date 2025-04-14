// src/pages/Search.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaHeart, FaRegHeart, FaDownload } from 'react-icons/fa';

export default function Search() {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const searchPapers = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to search papers');
      }
      
      const data = await response.json();
      setPapers(data.papers || []);
    } catch (err) {
      setError('Failed to search papers. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (paperId) => {
    if (!user) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.uid,
          paper_id: paperId,
          action: 'toggle'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update library');
      }
      
      // Update local state to reflect the change
      setPapers(papers.map(paper => 
        paper.id === paperId 
          ? { ...paper, is_favorite: !paper.is_favorite }
          : paper
      ));
    } catch (err) {
      console.error('Error updating library:', err);
    }
  };

  const downloadPaper = async (paperId) => {
    if (!user) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/papers/${paperId}/download`, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to download paper');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paper-${paperId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading paper:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Papers</h1>
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for papers..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4B8795]"
            />
            <button
              onClick={searchPapers}
              disabled={loading}
              className="px-4 py-2 bg-[#4B8795] text-white rounded-md hover:bg-[#407986] focus:outline-none focus:ring-2 focus:ring-[#4B8795]"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {papers.map((paper) => (
            <div key={paper.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{paper.title}</h2>
                  <p className="text-gray-600 mt-2">{paper.authors.join(', ')}</p>
                  <p className="text-gray-500 text-sm mt-1">{paper.year}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleFavorite(paper.id)}
                    className="text-red-500 hover:text-red-600"
                    title={paper.is_favorite ? "Remove from library" : "Add to library"}
                  >
                    {paper.is_favorite ? <FaHeart /> : <FaRegHeart />}
                  </button>
                  <button
                    onClick={() => downloadPaper(paper.id)}
                    className="text-[#4B8795] hover:text-[#407986]"
                    title="Download paper"
                  >
                    <FaDownload />
                  </button>
                </div>
              </div>
              <p className="mt-4 text-gray-700">{paper.abstract}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
